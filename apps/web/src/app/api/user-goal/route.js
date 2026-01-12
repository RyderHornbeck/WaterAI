import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import globalCache, {
  userSettingsCacheKey,
  invalidateUserCaches,
} from "@/app/api/utils/cache";
import { getGoalForDate } from "@/app/api/utils/getGoalForDate";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;
    let userEmail = null;

    if (token) {
      console.log(
        `[API user-goal POST ${timestamp}] Authorization header found, validating token`,
      );

      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        userEmail = user.email;
        console.log(
          `[API user-goal POST ${timestamp}] Token validated successfully`,
          { userId, userEmail },
        );
      } else {
        console.log(
          `[API user-goal POST ${timestamp}] Token validation failed`,
        );
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      console.log(
        `[API user-goal POST ${timestamp}] No valid token, checking session cookies`,
      );
      const session = await auth();

      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = parseInt(session.user.id, 10);
      userEmail = session.user.email;
    }

    if (isNaN(userId)) {
      console.error(
        `[API user-goal POST ${timestamp}] Invalid user ID:`,
        userId,
      );
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    console.log(
      `[API user-goal POST ${timestamp}] Saving settings for user ${userId} (${userEmail})`,
    );

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const {
      gender,
      age,
      heightWeight,
      workoutsPerWeek,
      waterGoal,
      waterUnit,
      handSize,
      sipSize,
      dailyGoal,
      timezone,
    } = body;

    console.log(`[API user-goal POST ${timestamp}] 🔍 RECEIVED BODY DEBUG:`, {
      gender,
      age,
      heightWeight,
      workoutsPerWeek: workoutsPerWeek,
      workoutsPerWeekType: typeof workoutsPerWeek,
      waterGoal,
      waterUnit,
      handSize,
      sipSize,
      dailyGoal,
      dailyGoalType: typeof dailyGoal,
      timezone,
    });

    // Convert heightWeight to cm and kg based on the unit they selected
    let heightCm = null;
    let weightKg = null;

    if (heightWeight) {
      if (heightWeight.unit === "imperial") {
        // User selected imperial, so convert their imperial values to metric for storage
        const totalInches =
          (Number(heightWeight.heightFeet) || 0) * 12 +
          (Number(heightWeight.heightInches) || 0);
        heightCm = Number((totalInches * 2.54).toFixed(1));
        weightKg = Number(
          ((heightWeight.weightLbs || 0) * 0.453592).toFixed(1),
        );
        console.log(
          `[API user-goal POST ${timestamp}] Converting from imperial:`,
          {
            heightFeet: heightWeight.heightFeet,
            heightInches: heightWeight.heightInches,
            totalInches,
            heightCm,
            weightLbs: heightWeight.weightLbs,
            weightKg,
          },
        );
      } else {
        // User selected metric, use their metric values directly
        heightCm = Number(heightWeight.heightCm);
        weightKg = Number(heightWeight.weightKg);
        console.log(`[API user-goal POST ${timestamp}] Using metric values:`, {
          heightCm,
          weightKg,
        });
      }
    } else {
      console.log(`[API user-goal POST ${timestamp}] No heightWeight provided`);
    }

    // ✅ Trust the frontend calculation if provided, otherwise calculate
    let finalGoal;

    if (dailyGoal && !isNaN(dailyGoal) && dailyGoal > 0) {
      // Use the exact goal provided by the frontend (already in oz)
      finalGoal = Math.round(Number(dailyGoal));
      console.log(
        `[API user-goal POST ${timestamp}] ✅ Using provided goal (no recalculation):`,
        {
          providedGoal: dailyGoal,
          finalGoal,
          source: "frontend calculation",
        },
      );
    } else if (weightKg && heightCm && age) {
      // Only calculate if no goal provided
      console.log(
        `[API user-goal POST ${timestamp}] No goal provided, calculating:`,
        {
          weightKg,
          heightCm,
          age,
        },
      );

      // NEW CALCULATION FORMULA
      // Step 1: Base fluids from body weight
      let baseOz = (weightKg * 33) / 29.5735;

      // Step 2A: Height adjustment
      const heightIn = heightCm / 2.54;
      let heightAdjOz = 0;
      if (heightIn >= 75) heightAdjOz = 10;
      else if (heightIn >= 70) heightAdjOz = 5;
      else if (heightIn <= 64) heightAdjOz = -5;

      // Step 2B: Age adjustment
      let ageAdjOz = 0;
      if (age >= 60) ageAdjOz = 10;
      else if (age <= 17) ageAdjOz = -5;
      else if (age >= 41) ageAdjOz = 5;

      // Step 2C: Gender adjustment
      let genderAdjOz = gender === "male" ? 5 : 0;

      // Step 2D: Adjusted base
      let adjustedBaseOz = baseOz + heightAdjOz + ageAdjOz + genderAdjOz;

      // Step 3: Workout frequency multiplier
      let workoutMult = 1.0;
      const parsedWorkouts =
        workoutsPerWeek !== undefined && workoutsPerWeek !== null
          ? typeof workoutsPerWeek === "string"
            ? parseInt(workoutsPerWeek, 10)
            : Number(workoutsPerWeek)
          : null;

      if (parsedWorkouts !== null) {
        if (parsedWorkouts === 0 || parsedWorkouts === 1) workoutMult = 1.0;
        else if (parsedWorkouts <= 3) workoutMult = 1.1;
        else if (parsedWorkouts <= 5) workoutMult = 1.2;
        else if (parsedWorkouts <= 6) workoutMult = 1.3;
        else workoutMult = 1.4;
      }

      // Step 4: Goal-based multiplier
      let goalMult = 1.0;
      if (waterGoal === "healthy" || waterGoal === "stay_fit") goalMult = 1.0;
      else if (waterGoal === "lose" || waterGoal === "lose_weight")
        goalMult = 1.05;
      else if (waterGoal === "gain" || waterGoal === "gain_weight")
        goalMult = 1.03;

      // Step 5: Final goal
      finalGoal = adjustedBaseOz * workoutMult * goalMult;

      console.log(
        `[API user-goal POST ${timestamp}] Calculated goal (backend formula):`,
        {
          weightKg,
          heightIn: heightIn.toFixed(1),
          age,
          gender,
          workoutsPerWeek: parsedWorkouts,
          waterGoal,
          baseOz: baseOz.toFixed(1),
          heightAdjOz,
          ageAdjOz,
          genderAdjOz,
          adjustedBaseOz: adjustedBaseOz.toFixed(1),
          workoutMult,
          goalMult,
          calculatedGoal: finalGoal.toFixed(1),
        },
      );

      finalGoal = Math.round(finalGoal);
      finalGoal = Math.max(48, Math.min(finalGoal, 200)); // Cap at 200 oz

      console.log(`[API user-goal POST ${timestamp}] Final calculated goal:`, {
        finalGoal,
      });
    } else {
      // No goal provided and insufficient data to calculate
      finalGoal = 64; // Default
      console.log(
        `[API user-goal POST ${timestamp}] Using default goal: 64 oz`,
      );
    }

    // Validate handSize and sipSize if provided
    if (handSize && typeof handSize !== "string") {
      return Response.json(
        { error: "handSize must be a string" },
        { status: 400 },
      );
    }

    if (sipSize && typeof sipSize !== "string") {
      return Response.json(
        { error: "sipSize must be a string" },
        { status: 400 },
      );
    }

    console.log(`[API user-goal POST ${timestamp}] Saving to database:`, {
      userId,
      finalGoal,
      gender,
      age,
      heightCm,
      weightKg,
      workoutsPerWeek,
      waterGoal,
      waterUnit,
    });

    // Insert or update user settings
    const result = await sql`
      INSERT INTO user_settings (
        user_id, 
        daily_goal, 
        hand_size, 
        sip_size, 
        gender,
        age,
        height_cm,
        weight_kg,
        workouts_per_week,
        water_goal,
        water_unit,
        timezone,
        onboarding_completed, 
        updated_at
      )
      VALUES (
        ${userId}, 
        ${Number(finalGoal)}, 
        ${handSize || null}, 
        ${sipSize || null},
        ${gender || null},
        ${age ? Number(age) : null},
        ${heightCm},
        ${weightKg},
        ${workoutsPerWeek !== undefined ? Number(workoutsPerWeek) : null},
        ${waterGoal || null},
        ${waterUnit || "oz"},
        ${timezone || "America/New_York"},
        true, 
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
      DO UPDATE SET 
        daily_goal = ${Number(finalGoal)},
        hand_size = ${handSize || null},
        sip_size = ${sipSize || null},
        gender = ${gender || null},
        age = ${age ? Number(age) : null},
        height_cm = ${heightCm},
        weight_kg = ${weightKg},
        workouts_per_week = ${workoutsPerWeek !== undefined ? Number(workoutsPerWeek) : null},
        water_goal = ${waterGoal || null},
        water_unit = ${waterUnit || "oz"},
        timezone = ${timezone || "America/New_York"},
        onboarding_completed = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    if (!result || result.length === 0) {
      throw new Error("Failed to save user settings");
    }

    // ✅ Create initial goal_history entry if this is first onboarding
    // This establishes the "beginning of time" to "end of time" range for their initial goal
    const existingGoalHistory = await sql`
      SELECT id FROM goal_history WHERE user_id = ${userId} LIMIT 1
    `;

    if (existingGoalHistory.length === 0) {
      // Get the earliest water entry date or use a far-back date
      const [earliestEntry] = await sql`
        SELECT MIN(entry_date) as earliest_date 
        FROM water_entries 
        WHERE user_id = ${userId} AND is_deleted = false
      `;

      let fromDate;
      if (earliestEntry?.earliest_date) {
        // Use the Monday of the earliest week
        const earliestDate = new Date(
          earliestEntry.earliest_date + "T12:00:00",
        );
        const dayOfWeek = earliestDate.getDay();
        const daysToMonday = (dayOfWeek + 6) % 7;
        const weekStart = new Date(earliestDate);
        weekStart.setDate(earliestDate.getDate() - daysToMonday);
        fromDate = weekStart.toISOString().split("T")[0];
      } else {
        // No water entries yet, use a far-back date to cover everything
        fromDate = "2020-01-01";
      }

      console.log(
        `[API user-goal POST ${timestamp}] Creating initial goal_history entry from ${fromDate}`,
      );

      await sql`
        INSERT INTO goal_history (
          user_id,
          daily_goal,
          effective_from_date,
          effective_until_date
        )
        VALUES (
          ${userId},
          ${Number(finalGoal)},
          ${fromDate},
          NULL
        )
        ON CONFLICT (user_id, effective_from_date) DO NOTHING
      `;
    }

    console.log(
      `[API user-goal POST ${timestamp}] Settings saved successfully for user ${userId}`,
    );

    // Invalidate user's caches
    invalidateUserCaches(userId);

    return Response.json({ success: true, calculatedGoal: finalGoal });
  } catch (error) {
    console.error(`[API user-goal POST ${timestamp}] ❌ ERROR:`, {
      type: error?.constructor?.name,
      name: error?.name,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack?.substring(0, 500),
    });

    // Build comprehensive error details
    const errorDetails = {
      type: error?.constructor?.name || typeof error,
      name: error?.name || "Unknown",
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      table: error?.table,
      column: error?.column,
    };

    // Graceful degradation for specific errors
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        {
          error: "Database temporarily unavailable. Please try again.",
          errorDetails,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: `Failed to save preferences: ${errorDetails.message}`,
        errorDetails,
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  const timestamp = new Date().toISOString();

  try {
    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;
    let userEmail = null;

    if (token) {
      console.log(
        `[API user-goal GET ${timestamp}] Authorization header found, validating token`,
      );

      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        userEmail = user.email;
        console.log(
          `[API user-goal GET ${timestamp}] Token validated successfully`,
          { userId, userEmail },
        );
      } else {
        console.log(`[API user-goal GET ${timestamp}] Token validation failed`);
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      console.log(
        `[API user-goal GET ${timestamp}] No valid token, checking session cookies`,
      );
      const session = await auth();

      console.log(`[API user-goal GET ${timestamp}] Request received`, {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      if (!session?.user?.id) {
        console.error(
          `[API user-goal GET ${timestamp}] Unauthorized - no session or token`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = parseInt(session.user.id, 10);
      userEmail = session.user.email;
    }

    if (isNaN(userId)) {
      console.error(
        `[API user-goal GET ${timestamp}] Invalid user ID:`,
        userId,
      );
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get optional date parameter - only query historical goal if date is provided
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    console.log(
      `[API user-goal GET ${timestamp}] Querying settings for user ${userId} (${userEmail})${dateParam ? ` on date ${dateParam}` : " (default/future goal)"}`,
    );

    // Phase 3: Check cache first (only for default goal, not date-specific)
    const cacheKey = userSettingsCacheKey(userId);
    const cached = globalCache.get(cacheKey);

    if (cached && !dateParam) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=60", // 1 minute cache
        },
      });
    }

    const settings = await sql`
      SELECT daily_goal, hand_size, sip_size, onboarding_completed, gender, age, height_cm, weight_kg, workouts_per_week, water_goal, water_unit, timezone, last_cleanup_date
      FROM user_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    // Return defaults if no settings found
    if (!settings || settings.length === 0) {
      console.log(
        `[API user-goal GET ${timestamp}] No settings found for user ${userId}, returning defaults`,
      );
      const defaultData = {
        dailyGoal: 64,
        handSize: null,
        sipSize: null,
        onboardingCompleted: false,
        gender: null,
        age: null,
        heightCm: null,
        weightKg: null,
        workoutsPerWeek: null,
        waterGoal: null,
        waterUnit: "oz",
        timezone: "America/New_York",
        lastCleanupDate: null,
      };
      return Response.json(defaultData);
    }

    const currentGoal = settings[0].daily_goal || 64;
    let goalForDay = currentGoal; // Default to current/future goal from user_settings

    // ✅ Only calculate historical goal if a specific date was requested
    if (dateParam) {
      goalForDay = await getGoalForDate(userId, dateParam);
    }

    console.log(
      `[API user-goal GET ${timestamp}] Settings found for user ${userId}:`,
      {
        onboardingCompleted: settings[0].onboarding_completed,
        currentGoal,
        goalForDay,
        isHistoricalQuery: !!dateParam,
        queryDate: dateParam || "default/future",
        gender: settings[0].gender,
        age: settings[0].age,
        heightCm: settings[0].height_cm,
        weightKg: settings[0].weight_kg,
        workoutsPerWeek: settings[0].workouts_per_week,
        waterGoal: settings[0].water_goal,
        timezone: settings[0].timezone,
      },
    );

    const responseData = {
      dailyGoal: goalForDay, // Use historical goal if date provided, else current/future goal
      handSize: settings[0].hand_size,
      sipSize: settings[0].sip_size,
      onboardingCompleted: settings[0].onboarding_completed || false,
      gender: settings[0].gender,
      age: settings[0].age,
      heightCm: settings[0].height_cm,
      weightKg: settings[0].weight_kg,
      workoutsPerWeek: settings[0].workouts_per_week,
      waterGoal: settings[0].water_goal,
      waterUnit: settings[0].water_unit || "oz",
      timezone: settings[0].timezone || "America/New_York",
      lastCleanupDate: settings[0].last_cleanup_date,
    };

    // Phase 3: Cache the result (only if no date param)
    if (!dateParam) {
      globalCache.set(cacheKey, responseData, 60000); // 1 minute cache
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error(`[API user-goal GET ${timestamp}] Error:`, {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Graceful degradation - return defaults
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        {
          error: "Database temporarily unavailable. Using defaults.",
          dailyGoal: 64,
          handSize: null,
          sipSize: null,
          onboardingCompleted: false,
          gender: null,
          age: null,
          heightCm: null,
          weightKg: null,
          workoutsPerWeek: null,
          waterGoal: null,
          waterUnit: "oz",
          climate: "temperate",
          sweatLevel: "normal",
          timezone: "America/New_York",
          lastCleanupDate: null,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: "Failed to fetch preferences",
        dailyGoal: 64,
        handSize: null,
        sipSize: null,
        onboardingCompleted: false,
        gender: null,
        age: null,
        heightCm: null,
        weightKg: null,
        workoutsPerWeek: null,
        waterGoal: null,
        waterUnit: "oz",
        climate: "temperate",
        sweatLevel: "normal",
        timezone: "America/New_York",
        lastCleanupDate: null,
      },
      { status: 500 },
    );
  }
}
