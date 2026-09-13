import { NextRequest, NextResponse } from "next/server";

const APP_NAME = "Wisp dApp Example";

export function GET(request: NextRequest) {
  const configuredUrl = String(process.env.NEXT_PUBLIC_DAPP_URL || "").trim();
  const origin = configuredUrl ? new URL(configuredUrl).origin : request.nextUrl.origin;

  return NextResponse.json(
    {
      url: origin,
      name: APP_NAME,
      iconUrl: `${origin}/wisp-icon.svg`,
      description: "Wisp Wallet dApp example for Vexanium.",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
