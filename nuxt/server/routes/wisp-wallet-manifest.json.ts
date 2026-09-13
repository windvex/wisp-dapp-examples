import { getRequestURL } from "h3";

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event);
  const configuredUrl = String(runtimeConfig.public.dappUrl || "").trim().replace(/\/+$/u, "");
  const origin = configuredUrl || getRequestURL(event).origin;

  return {
    url: origin,
    name: "Wisp dApp Example",
    iconUrl: `${origin}/wisp-icon.svg`,
  };
});
