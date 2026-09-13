import { env } from "$env/dynamic/public";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = ({ url }) => {
  const origin = (env.PUBLIC_DAPP_URL || url.origin).replace(/\/+$/u, "");

  return json({
    url: origin,
    name: "Wisp dApp Example",
    iconUrl: `${origin}/wisp-icon.svg`,
  });
};
