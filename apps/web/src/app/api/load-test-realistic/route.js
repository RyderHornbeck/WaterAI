import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { randomBytes } from "crypto";

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { base64, mimeType: contentType };
}

// Create a real session token for testing
async function createRealSessionToken(userId) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await sql`
    INSERT INTO auth_sessions ("userId", "sessionToken", expires)
    VALUES (${userId}, ${sessionToken}, ${expires})
  `;

  return sessionToken;
}

// Simulate a single user's complete flow
async function simulateUserRequest(imageData, sessionToken, baseUrl) {
  const startTime = Date.now();
  const timings = {
    start: startTime,
    createRequest: null,
    createResponse: null,
    pollAttempts: 0,
    firstPoll: null,
    lastPoll: null,
    complete: null,
  };

  try {
    // Step 1: Create water analysis job (like mobile app does)
    const createStart = Date.now();
    const createResponse = await fetch(`${baseUrl}/api/analyze-water-async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${sessionToken}`,
      },
      body: JSON.stringify({
        base64: imageData.base64,
        mimeType: imageData.mimeType,
        servings: 1,
        liquidType: null,
      }),
    });

    timings.createRequest = Date.now() - createStart;

    if (!createResponse.ok) {
      throw new Error(
        `Create job failed: ${createResponse.status} ${createResponse.statusText}`,
      );
    }

    const { jobId } = await createResponse.json();
    timings.createResponse = Date.now() - startTime;

    if (!jobId) {
      throw new Error("No jobId returned");
    }

    // Step 2: Poll for results (like mobile app does)
    let status = "pending";
    let result = null;
    const maxPolls = 60; // 2 minutes max (2s intervals)

    while (status === "pending" && timings.pollAttempts < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay like mobile app

      timings.pollAttempts++;
      const pollStart = Date.now();

      const pollResponse = await fetch(`${baseUrl}/api/job-status/${jobId}`, {
        headers: {
          Cookie: `next-auth.session-token=${sessionToken}`,
        },
      });

      if (!timings.firstPoll) {
        timings.firstPoll = Date.now() - startTime;
      }

      if (!pollResponse.ok) {
        throw new Error(`Poll failed: ${pollResponse.status}`);
      }

      const pollData = await pollResponse.json();
      status = pollData.status;
      result = pollData.result;

      timings.lastPoll = Date.now() - startTime;
    }

    timings.complete = Date.now() - startTime;

    return {
      success: status === "complete",
      status,
      jobId,
      timings,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timings,
    };
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      imageUrl,
      concurrency = 10,
      totalRequests = 100,
    } = await request.json();

    if (!imageUrl) {
      return Response.json({ error: "Image URL required" }, { status: 400 });
    }

    if (concurrency < 1 || concurrency > 50) {
      return Response.json(
        { error: "Concurrency must be between 1 and 50" },
        { status: 400 },
      );
    }

    if (totalRequests < 1 || totalRequests > 500) {
      return Response.json(
        { error: "Total requests must be between 1 and 500" },
        { status: 400 },
      );
    }

    console.log(
      `🧪 Realistic Load Test: ${totalRequests} requests, ${concurrency} concurrent`,
    );

    // Fetch the image once
    console.log(`📥 Fetching image from ${imageUrl}...`);
    const imageData = await fetchImageAsBase64(imageUrl);
    console.log(`✅ Image fetched (${imageData.base64.length} bytes)`);

    // Use the external published app URL for realistic load testing
    const baseUrl = "https://water-tracker-app-998.created.app";
    console.log(`🔗 Using baseUrl: ${baseUrl}`);

    // Create a real session token for this user
    console.log(`🔑 Creating session token for user ${session.user.id}...`);
    const sessionToken = await createRealSessionToken(session.user.id);
    console.log(`✅ Session token created`);

    // Run requests in batches (concurrency control)
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < totalRequests; i += concurrency) {
      const batchSize = Math.min(concurrency, totalRequests - i);
      const batchPromises = [];

      for (let j = 0; j < batchSize; j++) {
        batchPromises.push(
          simulateUserRequest(imageData, sessionToken, baseUrl),
        );
      }

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map((r) =>
          r.status === "fulfilled"
            ? r.value
            : { success: false, error: r.reason?.message || "Unknown error" },
        ),
      );

      console.log(
        `✅ Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(totalRequests / concurrency)} (${results.length}/${totalRequests} total)`,
      );
    }

    const totalTime = Date.now() - startTime;

    // Clean up the test session token
    await sql`
      DELETE FROM auth_sessions 
      WHERE "sessionToken" = ${sessionToken}
    `;

    // Calculate metrics
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const timings = successful.map((r) => r.timings);
    const avgCreateRequest =
      timings.reduce((sum, t) => sum + (t.createRequest || 0), 0) /
      timings.length;
    const avgCreateResponse =
      timings.reduce((sum, t) => sum + (t.createResponse || 0), 0) /
      timings.length;
    const avgPollAttempts =
      timings.reduce((sum, t) => sum + (t.pollAttempts || 0), 0) /
      timings.length;
    const avgComplete =
      timings.reduce((sum, t) => sum + (t.complete || 0), 0) / timings.length;

    const completeTimes = successful.map((r) => r.timings.complete);
    const minComplete = completeTimes.length ? Math.min(...completeTimes) : 0;
    const maxComplete = completeTimes.length ? Math.max(...completeTimes) : 0;

    // Group errors
    const errorGroups = {};
    failed.forEach((r) => {
      const errorMsg = r.error || "Unknown";
      errorGroups[errorMsg] = (errorGroups[errorMsg] || 0) + 1;
    });

    return Response.json({
      summary: {
        totalRequests,
        concurrency,
        successful: successful.length,
        failed: failed.length,
        successRate: `${((successful.length / totalRequests) * 100).toFixed(1)}%`,
        totalTimeSeconds: (totalTime / 1000).toFixed(1),
        requestsPerSecond: (totalRequests / (totalTime / 1000)).toFixed(2),
      },
      timings: {
        avgCreateRequestMs: Math.round(avgCreateRequest),
        avgCreateResponseMs: Math.round(avgCreateResponse),
        avgPollAttempts: avgPollAttempts.toFixed(1),
        avgCompleteMs: Math.round(avgComplete),
        minCompleteMs: minComplete,
        maxCompleteMs: maxComplete,
        avgCompleteSeconds: (avgComplete / 1000).toFixed(1),
        minCompleteSeconds: (minComplete / 1000).toFixed(1),
        maxCompleteSeconds: (maxComplete / 1000).toFixed(1),
      },
      errors: errorGroups,
      sampleSuccessful: successful.slice(0, 3).map((r) => ({
        jobId: r.jobId,
        timings: r.timings,
        result: r.result,
      })),
      sampleFailed: failed.slice(0, 5).map((r) => ({
        error: r.error,
        timings: r.timings,
      })),
    });
  } catch (error) {
    console.error("❌ Realistic load test error:", error);
    return Response.json(
      {
        error: error.message,
        stack: process.env.ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
