import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useWeeklySummaryData } from "@/hooks/useWeeklySummaryData";
import { WeeklySummaryHeader } from "./WeeklySummaryHeader";
import { LiveSundayNotice } from "./LiveSundayNotice";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { NoDataState } from "./NoDataState";
import { AverageDailySection } from "./AverageDailySection";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { LiquidTypesSection } from "./LiquidTypesSection";
import { ConsistencySection } from "./ConsistencySection";
import { ComparisonSection } from "./ComparisonSection";

export function WeeklySummary({ visible, onClose, weekStart, isLiveSunday }) {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refetch } = useWeeklySummaryData(
    visible,
    weekStart,
  );
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const scale = Math.min(screenWidth / 390, 1.2);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, weekStart]);

  const hasData = data && data.summary && data.summary.totalOunces > 0;

  // Interpolate gradient opacity based on scroll position
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, 500],
    outputRange: [1, 0.3],
    extrapolate: "clamp",
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        }}
      >
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 28 * scale,
            borderTopRightRadius: 28 * scale,
            height: screenHeight * 0.9,
            paddingBottom: insets.bottom,
            overflow: "hidden",
          }}
        >
          {/* Animated Gradient Background - positioned absolutely to cover entire modal */}
          {data && hasData && (
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                opacity: gradientOpacity,
                zIndex: 0,
              }}
              pointerEvents="none"
            >
              <LinearGradient
                colors={["#BFDBFE", "#FFFFFF"]}
                style={{
                  width: "100%",
                  height: screenHeight * 1.5,
                }}
              />
            </Animated.View>
          )}

          {/* Header */}
          <WeeklySummaryHeader
            data={data}
            onClose={onClose}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            scale={scale}
          />

          {/* Live Sunday Notice */}
          {isLiveSunday && data && hasData && (
            <LiveSundayNotice scale={scale} />
          )}

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} scale={scale} />
          ) : !hasData ? (
            <NoDataState scale={scale} />
          ) : (
            <Animated.ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 * scale }}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false },
              )}
              scrollEventThrottle={16}
            >
              <AverageDailySection data={data} scale={scale} />
              <TimeOfDaySection data={data} scale={scale} />
              <LiquidTypesSection data={data} scale={scale} />
              <ConsistencySection data={data} scale={scale} />
              <ComparisonSection data={data} scale={scale} />
            </Animated.ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
