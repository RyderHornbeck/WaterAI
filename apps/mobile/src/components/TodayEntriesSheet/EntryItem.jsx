import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import { Trash2, Flag } from "lucide-react-native";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function EntryItem({
  entry,
  isHistorical,
  isCollapsing,
  collapseAnim,
  onDelete,
  onToggleFavorite,
  isTogglingFavorite,
}) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const formatClassification = (classification) => {
    if (!classification) return "";
    if (classification === "smoothie") return "Smoothie/Protein Shake";
    return classification
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isImageEntry = entry.image_url;
  const isDescriptionEntry = entry.classification === "description";
  const isManualEntry = !isImageEntry && !isDescriptionEntry;
  const isFavorited = entry.is_favorited || false;
  const createdFromFavorite = entry.created_from_favorite || false;
  const showFilledFlag = isFavorited || createdFromFavorite;

  const animatedHeight = collapseAnim
    ? collapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 96],
      })
    : 96;

  const animatedOpacity = collapseAnim || new Animated.Value(1);

  const containerStyle = isCollapsing
    ? {
        height: animatedHeight,
        opacity: animatedOpacity,
        overflow: "hidden",
        marginBottom: 12,
      }
    : {
        marginBottom: 12,
      };

  return (
    <Animated.View style={containerStyle}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#F8FAFC",
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* Left side - Image or Icon */}
        <View
          style={{
            width: 80,
            height: 80,
            marginRight: 16,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: isImageEntry
              ? "#E2E8F0"
              : isDescriptionEntry
                ? "#3B82F6"
                : "#10B981",
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
            <Text style={{ fontSize: 40 }}>✏️</Text>
          ) : (
            <Text style={{ fontSize: 40 }}>💧</Text>
          )}
        </View>

        {/* Middle - Details */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#0EA5E9",
              marginBottom: 4,
            }}
          >
            {formatWaterAmount(entry.ounces, waterUnit)}{" "}
            {getUnitLabel(waterUnit)}
          </Text>

          {entry.classification && (
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#3B82F6",
                }}
              >
                {formatClassification(entry.classification)}
              </Text>
              {entry.servings && entry.servings > 1 && (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#000000",
                  }}
                >
                  {` x ${entry.servings}`}
                </Text>
              )}
            </View>
          )}

          {entry.liquid_type && entry.liquid_type !== "water" && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              {entry.liquid_type === "smoothie"
                ? "Smoothie/Protein Shake"
                : entry.liquid_type.charAt(0).toUpperCase() +
                  entry.liquid_type.slice(1)}
            </Text>
          )}

          {entry.description && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {entry.description}
            </Text>
          )}

          <Text
            style={{
              fontSize: 12,
              color: "#94A3B8",
            }}
          >
            {formatTime(entry.timestamp)}
          </Text>
        </View>

        {/* Right side - Favorite and Delete buttons */}
        {!isHistorical && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignSelf: "center",
            }}
          >
            {/* Only show favorite button for image and description entries */}
            {!isManualEntry && (
              <TouchableOpacity
                onPress={() =>
                  onToggleFavorite(entry.id, isFavorited, createdFromFavorite)
                }
                disabled={isTogglingFavorite}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: showFilledFlag ? "#FEF3C7" : "#F8FAFC",
                  opacity: isTogglingFavorite ? 0.5 : 1,
                }}
              >
                <Flag
                  color="#FCD34D"
                  size={24}
                  fill={showFilledFlag ? "#FCD34D" : "transparent"}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => onDelete(entry.id, entry.ounces)}
              style={{
                alignSelf: "center",
                padding: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
