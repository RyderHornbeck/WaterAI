import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Animated,
} from "react-native";
import { X, ChevronDown, ChevronUp, Trash2, Flag } from "lucide-react-native";
import { invalidateWaterCaches } from "@/utils/dataCache";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function DayDetailView({
  date,
  entries,
  totalOz,
  goalOz, // This should be the historical goal for this day
  onClose,
  loadingDetails,
  scale = 1,
  containerWidth,
  onEntryDeleted,
  isHistorical = false,
  historicalMessage = null,
}) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, ounces }
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [collapsingIds, setCollapsingIds] = useState(new Set()); // Track which entries are collapsing
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false); // Track if delete is in progress
  const collapseAnims = useRef(new Map()); // Map of entry id to collapse animation value

  const fillPercent = Math.min(totalOz / goalOz, 1.0); // Use the historical goal passed as prop
  const cupWidth = 120 * scale;
  const cupHeight = 280 * scale;

  // Add padding that scales properly - 6 on sides, 8 top/bottom
  const sidePadding = 6 * scale;
  const verticalPadding = 8 * scale;
  const innerWidth = cupWidth - sidePadding * 2;
  const innerHeight = cupHeight - verticalPadding * 2;
  const fillHeight = Math.max(innerHeight * fillPercent, 0);

  // Calculate percentage capped at 100%
  const percentComplete = Math.min(Math.round((totalOz / goalOz) * 100), 100);

  // Format ounces to remove unnecessary decimals
  const formatOz = (oz) => {
    const num = parseFloat(oz);
    return num % 1 === 0 ? Math.round(num) : num;
  };

  // Determine which entries to show
  const maxInitialEntries = 8;
  const hasMoreEntries = entries && entries.length > maxInitialEntries;
  const displayedEntries =
    showAllEntries || !hasMoreEntries
      ? entries
      : entries.slice(0, maxInitialEntries);
  const remainingCount = entries ? entries.length - maxInitialEntries : 0;

  const handleDeleteEntry = async (entryId, ounces) => {
    setConfirmDelete({ id: entryId, ounces });
  };

  const confirmDeleteEntry = async () => {
    if (!confirmDelete || isDeletingInProgress) return;

    const { id, ounces } = confirmDelete;

    // Set deleting state FIRST
    setIsDeletingInProgress(true);
    setDeletingIds((prev) => new Set([...prev, id]));

    // Give React time to re-render with "Deleting..." state
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 15000);
      });

      // Race between fetch and timeout - USE fetchWithAuth for proper authentication
      const response = await Promise.race([
        fetchWithAuth(`/api/water-entry/${id}`, {
          method: "DELETE",
        }),
        timeoutPromise,
      ]);

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }

      // Invalidate all water-related caches FIRST
      await invalidateWaterCaches();

      // THEN notify parent to refetch (parent will get fresh data from DB)
      // WAIT for the refetch to complete before proceeding
      if (onEntryDeleted) {
        await onEntryDeleted();
      }

      // NOW that we have fresh data from DB (without the deleted entry),
      // close the modal and start collapse animation
      setConfirmDelete(null);
      setIsDeletingInProgress(false);

      // Wait for modal close animation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // NOW start collapse animation (entry already removed from data)
      setCollapsingIds((prev) => new Set([...prev, id]));

      // Create animation value if it doesn't exist
      if (!collapseAnims.current.has(id)) {
        collapseAnims.current.set(id, new Animated.Value(1));
      }

      const collapseAnim = collapseAnims.current.get(id);

      // Animate collapse
      Animated.timing(collapseAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }).start();

      // Wait 100ms for collapse animation to finish
      setTimeout(() => {
        // Clean up animation
        collapseAnims.current.delete(id);
        setCollapsingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        setDeletingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 100);
    } catch (error) {
      console.error("Error deleting entry:", error);

      // Reset state on error
      setConfirmDelete(null);
      setIsDeletingInProgress(false);

      // Check if it was a timeout or network error
      if (
        error.message === "timeout" ||
        error.message === "Network request failed" ||
        error.name === "TypeError"
      ) {
        setShowErrorAlert(true);
      }

      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <>
      <View
        style={{
          width: containerWidth,
          paddingVertical: 24 * scale,
          alignItems: "center",
        }}
      >
        {/* Header with close button - full width */}
        <View
          style={{
            width: containerWidth - 32 * scale,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20 * scale,
          }}
        >
          <Text
            style={{
              fontSize: 18 * scale,
              fontWeight: "700",
              color: "#1E293B",
            }}
          >
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32 * scale,
              height: 32 * scale,
              backgroundColor: "#F0F9FF",
              borderRadius: 16 * scale,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X color="#3B82F6" size={20 * scale} />
          </TouchableOpacity>
        </View>

        {/* Centered content - bottle and entries as a group */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Left side - Enlarged Bottle with multiple glare spots and proper padding */}
          <View style={{ alignItems: "center", marginRight: 16 * scale }}>
            {/* Percentage text above bottle */}
            <Text
              style={{
                fontSize: 14 * scale,
                fontWeight: "700",
                color: "#0EA5E9",
                marginBottom: 8 * scale,
              }}
            >
              {percentComplete}% of daily goal
            </Text>

            {/* Bottle cap */}
            <View
              style={{
                width: cupWidth * 0.7,
                height: 40 * scale,
                backgroundColor: "#0EA5E9",
                borderRadius: 8 * scale,
                marginBottom: -2 * scale,
                zIndex: 2,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* First horizontal white line */}
              <View
                style={{
                  width: "85%",
                  height: 2 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  marginBottom: 8 * scale,
                }}
              />
              {/* Second horizontal white line */}
              <View
                style={{
                  width: "85%",
                  height: 2 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                }}
              />
            </View>

            <View
              style={{
                width: cupWidth,
                height: cupHeight,
                backgroundColor: "rgba(224, 242, 254, 0.3)",
                borderRadius: 16 * scale,
                borderWidth: 3 * scale,
                borderColor: "#BFDBFE",
                overflow: "hidden",
                justifyContent: "flex-end",
                alignItems: "center",
                paddingVertical: verticalPadding,
              }}
            >
              {/* Water fill with proper spacing from edges and centered */}
              <View
                style={{
                  width: innerWidth,
                  height: fillHeight,
                  backgroundColor: "#0EA5E9",
                  borderRadius: 10 * scale,
                }}
              />

              {/* Multiple glare spots for more detail */}
              {/* Main glare - left side */}
              <View
                style={{
                  position: "absolute",
                  top: 20 * scale,
                  left: 15 * scale,
                  width: 22 * scale,
                  height: 70 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.35)",
                  borderRadius: 11 * scale,
                }}
              />

              {/* Secondary glare - smaller, left side */}
              <View
                style={{
                  position: "absolute",
                  top: 100 * scale,
                  left: 12 * scale,
                  width: 16 * scale,
                  height: 40 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  borderRadius: 8 * scale,
                }}
              />

              {/* Tertiary glare - right side */}
              <View
                style={{
                  position: "absolute",
                  top: 30 * scale,
                  right: 18 * scale,
                  width: 12 * scale,
                  height: 35 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 6 * scale,
                }}
              />

              {/* Small accent glare - top right */}
              <View
                style={{
                  position: "absolute",
                  top: 75 * scale,
                  right: 20 * scale,
                  width: 8 * scale,
                  height: 20 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  borderRadius: 4 * scale,
                }}
              />

              {/* Bottom glare - subtle */}
              <View
                style={{
                  position: "absolute",
                  bottom: 25 * scale,
                  left: 16 * scale,
                  width: 18 * scale,
                  height: 30 * scale,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: 9 * scale,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 16 * scale,
                fontWeight: "700",
                color: "#1E293B",
                marginTop: 12 * scale,
              }}
            >
              {formatWaterAmount(totalOz, waterUnit)} /{" "}
              {formatWaterAmount(goalOz, waterUnit)} {getUnitLabel(waterUnit)}
            </Text>
          </View>

          {/* Right side - Entries with images */}
          <View style={{ width: 200 * scale, paddingTop: 10 * scale }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingDetails ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : isHistorical ? (
                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderRadius: 12 * scale,
                    padding: 12 * scale,
                    borderWidth: 1 * scale,
                    borderColor: "#FCD34D",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13 * scale,
                      color: "#92400E",
                      fontWeight: "600",
                      marginBottom: 6 * scale,
                    }}
                  >
                    Historical Data
                  </Text>
                  <Text
                    style={{
                      fontSize: 12 * scale,
                      color: "#78350F",
                      lineHeight: 16 * scale,
                    }}
                  >
                    {historicalMessage ||
                      "Detailed entries are only available for the last 40 days. Only daily totals are shown for older dates."}
                  </Text>
                </View>
              ) : !entries || entries.length === 0 ? (
                <Text
                  style={{
                    fontSize: 14 * scale,
                    color: "#64748B",
                    fontStyle: "italic",
                  }}
                >
                  No entries yet
                </Text>
              ) : (
                <>
                  {displayedEntries.map((entry, index) => {
                    const time = new Date(entry.timestamp).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      },
                    );

                    const isImageEntry = entry.image_url;
                    const isDescriptionEntry = entry.description;
                    const isDeleting = deletingIds.has(entry.id);
                    const isCollapsing = collapsingIds.has(entry.id);
                    const collapseAnim = collapseAnims.current.get(entry.id);
                    const isFavorited = entry.is_favorited || false;
                    const createdFromFavorite =
                      entry.created_from_favorite || false;
                    const showFilledFlag = isFavorited || createdFromFavorite;

                    // Format classification for display
                    const classificationLabel = entry.classification
                      ? entry.classification === "smoothie"
                        ? "Smoothie/Protein Shake"
                        : entry.classification
                            .split("-")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")
                      : "Water";

                    // Animated values for collapse
                    const animatedHeight = collapseAnim
                      ? collapseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 66 * scale], // Entry height + margin
                        })
                      : 66 * scale;

                    const animatedOpacity =
                      collapseAnim || new Animated.Value(1);

                    const containerStyle = isCollapsing
                      ? {
                          height: animatedHeight,
                          opacity: animatedOpacity,
                          overflow: "hidden",
                          marginBottom: 16 * scale,
                        }
                      : {
                          marginBottom: 16 * scale,
                        };

                    return (
                      <Animated.View key={entry.id} style={containerStyle}>
                        <View
                          style={{
                            flexDirection: "row",
                            backgroundColor: isDeleting ? "#FEE2E2" : "#F8FAFC",
                            borderRadius: 12 * scale,
                            padding: 8 * scale,
                          }}
                        >
                          {/* Left side - Image/Icon */}
                          <View
                            style={{
                              width: 50 * scale,
                              height: 50 * scale,
                              marginRight: 8 * scale,
                              borderRadius: 8 * scale,
                              overflow: "hidden",
                              backgroundColor: "#E2E8F0",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isImageEntry ? (
                              <Image
                                source={{ uri: entry.image_url }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            ) : isDescriptionEntry ? (
                              <Text
                                style={{
                                  fontSize: 10 * scale,
                                  color: "#64748B",
                                  textAlign: "center",
                                  paddingHorizontal: 4 * scale,
                                }}
                                numberOfLines={3}
                              >
                                "{entry.description}"
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 24 * scale }}>💧</Text>
                            )}
                          </View>

                          {/* Middle - Details */}
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6 * scale,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 15 * scale,
                                  fontWeight: "700",
                                  color: "#0EA5E9",
                                }}
                              >
                                {formatWaterAmount(entry.ounces, waterUnit)}{" "}
                                {getUnitLabel(waterUnit)}
                              </Text>

                              {/* Favorite Flag Indicator */}
                              {showFilledFlag && (
                                <Flag
                                  color="#FCD34D"
                                  size={14 * scale}
                                  fill="#FCD34D"
                                />
                              )}
                            </View>

                            {/* Classification */}
                            {entry.classification && (
                              <View style={{ flexDirection: "row" }}>
                                <Text
                                  style={{
                                    fontSize: 11 * scale,
                                    color: "#3B82F6",
                                    fontWeight: "600",
                                    marginTop: 2 * scale,
                                  }}
                                >
                                  {classificationLabel}
                                </Text>
                                {entry.servings && entry.servings > 1 && (
                                  <Text
                                    style={{
                                      fontSize: 11 * scale,
                                      color: "#000000",
                                      fontWeight: "600",
                                      marginTop: 2 * scale,
                                    }}
                                  >
                                    {` x ${entry.servings}`}
                                  </Text>
                                )}
                              </View>
                            )}

                            {/* Liquid Type */}
                            {entry.liquid_type &&
                              entry.liquid_type !== "water" && (
                                <Text
                                  style={{
                                    fontSize: 10 * scale,
                                    fontWeight: "500",
                                    color: "#64748B",
                                    marginTop: 2 * scale,
                                  }}
                                >
                                  {entry.liquid_type === "smoothie"
                                    ? "Smoothie/Protein Shake"
                                    : entry.liquid_type
                                        .charAt(0)
                                        .toUpperCase() +
                                      entry.liquid_type.slice(1)}
                                </Text>
                              )}

                            {/* Time */}
                            <Text
                              style={{
                                fontSize: 11 * scale,
                                color: "#64748B",
                                marginTop: 2 * scale,
                              }}
                            >
                              {time}
                            </Text>
                          </View>

                          {/* Right side - Delete button */}
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteEntry(entry.id, entry.ounces)
                            }
                            disabled={isDeleting}
                            style={{
                              width: 36 * scale,
                              height: 36 * scale,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 8 * scale,
                              backgroundColor: isDeleting
                                ? "#FCA5A5"
                                : "#FEE2E2",
                            }}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Trash2 color="#DC2626" size={18 * scale} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </Animated.View>
                    );
                  })}

                  {hasMoreEntries && (
                    <TouchableOpacity
                      onPress={() => setShowAllEntries(!showAllEntries)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 12 * scale,
                        paddingHorizontal: 16 * scale,
                        backgroundColor: "#F0F9FF",
                        borderRadius: 12 * scale,
                        borderWidth: 1 * scale,
                        borderColor: "#BFDBFE",
                        marginTop: 4 * scale,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13 * scale,
                          fontWeight: "600",
                          color: "#0EA5E9",
                          marginRight: 6 * scale,
                        }}
                      >
                        {showAllEntries
                          ? "Show less"
                          : `Show ${remainingCount} more ${remainingCount === 1 ? "entry" : "entries"}`}
                      </Text>
                      {showAllEntries ? (
                        <ChevronUp color="#0EA5E9" size={16 * scale} />
                      ) : (
                        <ChevronDown color="#0EA5E9" size={16 * scale} />
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Custom Delete Confirmation Modal - renders on top */}
      <Modal
        visible={!!confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingInProgress && setConfirmDelete(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Delete Entry
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#64748B",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              Are you sure you want to delete this{" "}
              {confirmDelete &&
                formatWaterAmount(confirmDelete.ounces, waterUnit)}{" "}
              {confirmDelete && getUnitLabel(waterUnit)} entry?
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmDelete(null)}
                disabled={isDeletingInProgress}
                style={{
                  flex: 1,
                  backgroundColor: isDeletingInProgress ? "#E2E8F0" : "#F1F5F9",
                  paddingVertical: 14,
                  borderRadius: 12,
                  opacity: isDeletingInProgress ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteEntry}
                disabled={isDeletingInProgress}
                style={{
                  flex: 1,
                  backgroundColor: isDeletingInProgress ? "#B91C1C" : "#DC2626",
                  paddingVertical: 14,
                  borderRadius: 12,
                  opacity: isDeletingInProgress ? 0.8 : 1,
                }}
              >
                {isDeletingInProgress ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color="#fff" />
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      Deleting...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Error Alert Modal - renders on top of everything */}
      <Modal
        visible={showErrorAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorAlert(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#DC2626",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Connection Too Slow
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#64748B",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              We couldn't delete the entry right now. Your WiFi or cellular
              connection seems slow. Please try again when you have a better
              connection.
            </Text>

            <TouchableOpacity
              onPress={() => setShowErrorAlert(false)}
              style={{
                backgroundColor: "#DC2626",
                paddingVertical: 14,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
