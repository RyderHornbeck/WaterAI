import { View, Text, Animated, ScrollView } from "react-native";
import { ChoiceQuestion } from "./ChoiceQuestion";
import { BottlesQuestion } from "./BottlesQuestion";
import { WelcomeQuestion } from "./WelcomeQuestion";
import { TriviaQuestion } from "./TriviaQuestion";
import { BrainTriviaQuestion } from "./BrainTriviaQuestion";
import { StatQuestion } from "./StatQuestion";
import NumberRollerQuestion from "./NumberRollerQuestion";
import HeightWeightQuestion from "./HeightWeightQuestion";
import { GoalCalculationQuestion } from "./GoalCalculationQuestion";
import { WaterAIExplainerQuestion } from "./WaterAIExplainerQuestion";
import { UITutorialQuestion } from "./UITutorialQuestion";

export function QuestionContent({
  question,
  currentAnswer,
  onAnswer,
  bottles,
  onPickImage,
  onUpdateBottleOunces,
  onRemoveBottle,
  slideAnim,
  fadeAnim,
  allAnswers,
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        }}
      >
        {question.type === "water-ai-explainer" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 32,
              }}
            >
              {question.question}
            </Text>
            <WaterAIExplainerQuestion question={question} />
          </ScrollView>
        ) : question.type === "ui-tutorial" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 32,
              }}
            >
              {question.question}
            </Text>
            <UITutorialQuestion />
          </ScrollView>
        ) : question.type === "welcome" ? (
          <WelcomeQuestion onAnswer={onAnswer} />
        ) : question.type === "trivia" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 12,
              }}
            >
              {question.question}
            </Text>
            <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 32 }}>
              {question.subtitle}
            </Text>
            <TriviaQuestion
              options={question.options}
              correctAnswer={question.correctAnswer}
              revealTitle={question.revealTitle}
              revealMessage={question.revealMessage}
              revealStats={question.revealStats}
              currentAnswer={currentAnswer}
              onAnswer={onAnswer}
            />
          </ScrollView>
        ) : question.type === "trivia-brain" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 12,
              }}
            >
              {question.question}
            </Text>
            <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 32 }}>
              {question.subtitle}
            </Text>
            <BrainTriviaQuestion
              options={question.options}
              correctAnswer={question.correctAnswer}
              revealTitle={question.revealTitle}
              revealMessage={question.revealMessage}
              currentAnswer={currentAnswer}
              onAnswer={onAnswer}
            />
          </ScrollView>
        ) : question.type === "stat" ? (
          <>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {question.question}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#64748B",
                marginBottom: 32,
                textAlign: "center",
              }}
            >
              {question.subtitle}
            </Text>
            <StatQuestion stats={question.stats} onAnswer={onAnswer} />
          </>
        ) : question.type === "number-roller" ? (
          <NumberRollerQuestion
            question={question}
            value={currentAnswer}
            onChange={onAnswer}
          />
        ) : question.type === "height-weight" ? (
          <HeightWeightQuestion
            question={question}
            value={currentAnswer}
            onChange={onAnswer}
          />
        ) : question.type === "goal-calculation" ? (
          <GoalCalculationQuestion
            value={currentAnswer}
            onChange={onAnswer}
            allAnswers={allAnswers}
          />
        ) : question.type === "choice" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 12,
              }}
            >
              {question.question}
            </Text>
            <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 32 }}>
              {question.subtitle}
            </Text>
            <ChoiceQuestion
              options={question.options}
              currentAnswer={currentAnswer}
              onAnswer={onAnswer}
            />
          </ScrollView>
        ) : question.type === "bottles" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#1E293B",
                marginBottom: 12,
              }}
            >
              {question.question}
            </Text>
            <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 32 }}>
              {question.subtitle}
            </Text>
            <BottlesQuestion
              bottles={bottles}
              onPickImage={onPickImage}
              onUpdateBottleOunces={onUpdateBottleOunces}
              onRemoveBottle={onRemoveBottle}
            />
          </ScrollView>
        ) : null}
      </Animated.View>
    </View>
  );
}
