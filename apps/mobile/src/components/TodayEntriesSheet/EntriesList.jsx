import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { EntryItem } from "./EntryItem";

export function EntriesList({
  entries,
  loading,
  isHistorical,
  collapsingIds,
  collapseAnims,
  togglingFavoriteIds,
  onDeleteEntry,
  onToggleFavorite,
}) {
  if (loading) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            style={{
              fontSize: 16,
              color: "#64748B",
              marginTop: 12,
            }}
          >
            Loading Entries...
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text
            style={{
              fontSize: 16,
              color: "#94A3B8",
              fontStyle: "italic",
            }}
          >
            No entries yet
          </Text>
        </View>
      </ScrollView>
    );
  }

  const reversedEntries = [...entries].reverse();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {reversedEntries.map((entry, index) => {
        const isCollapsing = collapsingIds.has(entry.id);
        const collapseAnim = collapseAnims.current.get(entry.id);
        const isTogglingFavorite = togglingFavoriteIds.has(entry.id);

        return (
          <EntryItem
            key={index}
            entry={entry}
            isHistorical={isHistorical}
            isCollapsing={isCollapsing}
            collapseAnim={collapseAnim}
            onDelete={onDeleteEntry}
            onToggleFavorite={onToggleFavorite}
            isTogglingFavorite={isTogglingFavorite}
          />
        );
      })}
    </ScrollView>
  );
}
