const turnstileSecretKey = import.meta.env.TURNSTILE_SECRET_KEY;

type TurnstileVerificationResponse = {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

function getRemoteIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("cf-connecting-ip") ?? undefined;
}

export async function verifyTurnstileToken(request: Request, token: string) {
  if (!turnstileSecretKey) {
    console.error("Turnstile verification attempted without TURNSTILE_SECRET_KEY.");
    return { success: false, errorCodes: ["missing-secret-key"] };
  }

  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const payload = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token
  });

  const remoteIp = getRemoteIp(request);

  if (remoteIp) {
    payload.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });

    if (!response.ok) {
      return { success: false, errorCodes: [`http-${response.status}`] };
    }

    const result = (await response.json()) as TurnstileVerificationResponse;

    return {
      success: Boolean(result.success),
      errorCodes: result["error-codes"] ?? []
    };
  } catch (error) {
    console.error("Turnstile verification request failed", error);
    return { success: false, errorCodes: ["verification-request-failed"] };
  }
}
