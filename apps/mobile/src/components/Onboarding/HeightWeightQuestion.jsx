import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

export default function HeightWeightQuestion({ question, value, onChange }) {
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState(value?.unit || "imperial");

  // Imperial values - use ?? instead of || to allow 0 values
  const [heightFeet, setHeightFeet] = useState(
    value?.heightFeet ?? question.defaults.heightFeet,
  );
  const [heightInches, setHeightInches] = useState(
    value?.heightInches ?? question.defaults.heightInches,
  );
  const [weightLbs, setWeightLbs] = useState(
    value?.weightLbs ?? question.defaults.weightLbs,
  );

  // Metric values - use ?? instead of || to allow 0 values
  const [heightCm, setHeightCm] = useState(
    value?.heightCm ?? question.defaults.heightCm,
  );
  const [weightKg, setWeightKg] = useState(
    value?.weightKg ?? question.defaults.weightKg,
  );

  const toggleAnim = useRef(
    new Animated.Value(unit === "imperial" ? 0 : 1),
  ).current;

  // Call onChange whenever any value changes
  useEffect(() => {
    onChange({
      unit,
      heightFeet,
      heightInches,
      weightLbs,
      heightCm,
      weightKg,
    });
  }, [unit, heightFeet, heightInches, weightLbs, heightCm, weightKg]);

  const handleUnitToggle = () => {
    const newUnit = unit === "imperial" ? "metric" : "imperial";

    // Convert values when switching
    if (newUnit === "metric") {
      const totalInches = heightFeet * 12 + heightInches;
      const newHeightCm = Math.round(totalInches * 2.54);
      const newWeightKg = Math.round(weightLbs * 0.453592);
      setHeightCm(newHeightCm);
      setWeightKg(newWeightKg);
    } else {
      const totalInches = Math.round(heightCm / 2.54);
      const newHeightFeet = Math.floor(totalInches / 12);
      const newHeightInches = totalInches % 12;
      const newWeightLbs = Math.round(weightKg / 0.453592);
      setHeightFeet(newHeightFeet);
      setHeightInches(newHeightInches);
      setWeightLbs(newWeightLbs);
    }

    setUnit(newUnit);

    Animated.spring(toggleAnim, {
      toValue: newUnit === "metric" ? 1 : 0,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const toggleBackgroundPosition = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "50%"],
  });

  const createRollerData = (min, max) => {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Question Header */}
      <View style={{ paddingHorizontal: 24, marginBottom: 20, marginTop: 20 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: "#1F2937",
            marginBottom: 12,
            lineHeight: 38,
          }}
        >
          {question.question}
        </Text>
        <Text style={{ fontSize: 17, color: "#6B7280", lineHeight: 24 }}>
          {question.subtitle}
        </Text>
      </View>

      {/* Unit Toggle */}
      <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
        <View
          style={{
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            padding: 4,
            flexDirection: "row",
            position: "relative",
            height: 48,
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 4,
              left: toggleBackgroundPosition,
              width: "46%",
              height: 40,
              backgroundColor: "#fff",
              borderRadius: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          />

          <TouchableOpacity
            onPress={handleUnitToggle}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: unit === "imperial" ? "#1F2937" : "#9CA3AF",
              }}
            >
              🇺🇸 Imperial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUnitToggle}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: unit === "metric" ? "#1F2937" : "#9CA3AF",
              }}
            >
              🌍 Metric
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Native iOS Pickers for Height & Weight */}
      <View style={{ flex: 1, paddingHorizontal: 4 }}>
        {unit === "imperial" ? (
          <View style={{ flexDirection: "row" }}>
            {/* Height Feet */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 8,
                  fontWeight: "600",
                }}
              >
                Height
              </Text>
              <Picker
                selectedValue={heightFeet}
                onValueChange={setHeightFeet}
                style={{ height: 200 }}
                itemStyle={{ fontSize: 20, height: 200, color: "#1F2937" }}
              >
                {createRollerData(
                  question.ranges.heightFeet.min,
                  question.ranges.heightFeet.max,
                ).map((val) => (
                  <Picker.Item key={val} label={`${val} ft`} value={val} />
                ))}
              </Picker>
            </View>

            {/* Height Inches */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 8,
                  fontWeight: "600",
                }}
              >
                {" "}
              </Text>
              <Picker
                selectedValue={heightInches}
                onValueChange={setHeightInches}
                style={{ height: 200 }}
                itemStyle={{ fontSize: 20, height: 200, color: "#1F2937" }}
              >
                {createRollerData(
                  question.ranges.heightInches.min,
                  question.ranges.heightInches.max,
                ).map((val) => (
                  <Picker.Item key={val} label={`${val} in`} value={val} />
                ))}
              </Picker>
            </View>

            {/* Weight Lbs */}
            <View style={{ flex: 1.2 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 8,
                  fontWeight: "600",
                }}
              >
                Weight
              </Text>
              <Picker
                selectedValue={weightLbs}
                onValueChange={setWeightLbs}
                style={{ height: 200 }}
                itemStyle={{ fontSize: 20, height: 200, color: "#1F2937" }}
              >
                {createRollerData(
                  question.ranges.weightLbs.min,
                  question.ranges.weightLbs.max,
                ).map((val) => (
                  <Picker.Item key={val} label={`${val} lbs`} value={val} />
                ))}
              </Picker>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row" }}>
            {/* Height Cm */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 8,
                  fontWeight: "600",
                }}
              >
                Height
              </Text>
              <Picker
                selectedValue={heightCm}
                onValueChange={setHeightCm}
                style={{ height: 200 }}
                itemStyle={{ fontSize: 20, height: 200, color: "#1F2937" }}
              >
                {createRollerData(
                  question.ranges.heightCm.min,
                  question.ranges.heightCm.max,
                ).map((val) => (
                  <Picker.Item key={val} label={`${val} cm`} value={val} />
                ))}
              </Picker>
            </View>

            {/* Weight Kg */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9CA3AF",
                  marginBottom: 8,
                  fontWeight: "600",
                }}
              >
                Weight
              </Text>
              <Picker
                selectedValue={weightKg}
                onValueChange={setWeightKg}
                style={{ height: 200 }}
                itemStyle={{ fontSize: 20, height: 200, color: "#1F2937" }}
              >
                {createRollerData(
                  question.ranges.weightKg.min,
                  question.ranges.weightKg.max,
                ).map((val) => (
                  <Picker.Item key={val} label={`${val} kg`} value={val} />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
