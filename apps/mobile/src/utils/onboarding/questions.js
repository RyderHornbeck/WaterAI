export const QUESTIONS = [
  // Q0: Welcome
  {
    id: 0,
    question: "Welcome to Water AI",
    subtitle: "Your personal hydration companion",
    key: "welcome",
    type: "welcome",
  },

  // Q1: Gender
  {
    id: 1,
    question: "What's your gender?",
    subtitle: "This helps us calculate your ideal daily goal",
    options: [
      { label: "👨 Male", value: "male", emoji: "👨" },
      { label: "👩 Female", value: "female", emoji: "👩" },
      { label: "⚧️ Non-binary", value: "nonbinary", emoji: "⚧️" },
      { label: "🤍 Prefer not to say", value: "other", emoji: "🤍" },
    ],
    key: "gender",
    type: "choice",
  },

  // Q2: Age
  {
    id: 2,
    question: "How old are you?",
    subtitle: "Age affects your hydration needs",
    minAge: 13,
    maxAge: 100,
    defaultAge: 25,
    key: "age",
    type: "number-roller",
  },

  // Q3: Height & Weight
  {
    id: 3,
    question: "What's your height and weight?",
    subtitle: "We'll calculate your personalized goal",
    key: "heightWeight",
    type: "height-weight",
    defaults: {
      heightFeet: 5,
      heightInches: 8,
      heightCm: 173,
      weightLbs: 150,
      weightKg: 68,
    },
    ranges: {
      heightFeet: { min: 4, max: 7 },
      heightInches: { min: 0, max: 11 },
      heightCm: { min: 120, max: 220 },
      weightLbs: { min: 80, max: 400 },
      weightKg: { min: 35, max: 180 },
    },
  },

  // Q4: Climate (NEW)
  {
    id: 4,
    question: "What's your climate like?",
    subtitle: "Temperature affects how much water you need",
    options: [
      { label: "🧊 Cold climate", value: "cold", emoji: "🧊" },
      { label: "🌤️ Temperate climate", value: "temperate", emoji: "🌤️" },
      { label: "🌡️ Hot climate", value: "hot", emoji: "🌡️" },
    ],
    key: "climate",
    type: "choice",
  },

  // Q5: Workouts Per Week (numeric values)
  {
    id: 5,
    question: "How often do you work out each week?",
    subtitle: "Active people need more water",
    options: [
      { label: "🛋️ 0-1 times", value: "0", emoji: "🛋️" },
      { label: "🚶 2-3 times", value: "2", emoji: "🚶" },
      { label: "🏃 4-5 times", value: "5", emoji: "🏃" },
      { label: "💪 6+ times", value: "7", emoji: "💪" },
    ],
    key: "workoutsPerWeek",
    type: "choice",
  },

  // Q6: Sweat Level (NEW)
  {
    id: 6,
    question: "How much do you sweat when you workout?",
    subtitle: "This helps us personalize your hydration needs",
    options: [
      { label: "💧 Sweat lightly", value: "low", emoji: "💧" },
      { label: "💦 Sweat moderately", value: "normal", emoji: "💦" },
      { label: "🌊 Sweat heavily", value: "high", emoji: "🌊" },
    ],
    key: "sweatLevel",
    type: "choice",
  },

  // Q7: Water Tracking Goal
  {
    id: 7,
    question: "What is your goal with tracking water?",
    subtitle: "We'll optimize your hydration plan",
    options: [
      { label: "🧘 Stay healthy / Stay fit", value: "healthy", emoji: "🧘" },
      { label: "⚖️ Lose weight", value: "lose", emoji: "⚖️" },
      { label: "💪 Gain weight / muscle", value: "gain", emoji: "💪" },
    ],
    key: "waterGoal",
    type: "choice",
  },

  // Q8: Water Unit Preference
  {
    id: 8,
    question: "How would you like to track water?",
    subtitle: "Choose your preferred measurement",
    options: [
      { label: "🥤 Ounces (oz)", value: "oz", emoji: "🥤" },
      { label: "💧 Liters (L)", value: "liters", emoji: "💧" },
    ],
    key: "waterUnit",
    type: "choice",
  },

  // Q9: Goal Calculation
  {
    id: 9,
    question: "Your Daily Hydration Goal",
    subtitle: "Calculated based on your personal information",
    key: "goalCalculation",
    type: "goal-calculation",
  },

  // Q10: Bottles
  {
    id: 10,
    question: "Add your water bottles",
    subtitle: "Take photos of bottles you drink from regularly (optional)",
    key: "bottles",
    type: "bottles",
  },

  // Q11: Sip Size
  {
    id: 11,
    question: "How do you usually drink?",
    subtitle: "Small sips, medium sips, or large gulps?",
    options: [
      { label: "💧 Small sips", value: "small", emoji: "💧" },
      { label: "💦 Medium sips", value: "medium", emoji: "💦" },
      { label: "🌊 Large gulps", value: "large", emoji: "🌊" },
    ],
    key: "sipSize",
    type: "choice",
  },

  // Q12: Hand Size
  {
    id: 12,
    question: "What's your hand size?",
    subtitle: "This helps us estimate cup sizes accurately",
    options: [
      { label: "🤏 Small", value: "small", emoji: "🤏" },
      { label: "✋ Medium", value: "medium", emoji: "✋" },
      { label: "🖐️ Large", value: "large", emoji: "🖐️" },
    ],
    key: "handSize",
    type: "choice",
  },

  // Q13: Water AI Explanation
  {
    id: 13,
    question: "Before you start",
    subtitle: "How Water AI works",
    key: "waterAIExplainer",
    type: "water-ai-explainer",
    content: {
      mainText:
        "Water AI analyzes each drink you log by identifying the container and the type of liquid, then estimates how much of that drink counts toward your daily water intake.",
      example: {
        title: "For example:",
        waterText: "Water counts fully toward your goal.",
        otherDrinksText:
          "Other drinks count partially based on their hydration value. A 12 oz soda, which is about 75% water, would count as 9 oz toward your daily water intake.",
      },
    },
  },

  // Q14: UI Tutorial
  {
    id: 14,
    question: "How to use Water AI",
    subtitle:
      "Water AI will identify the liquid and bottle and use this information to calculate how much water that counts to your water intake goal",
    key: "uiTutorial",
    type: "ui-tutorial",
  },
];
