export function getGatewayUrl() {
  return process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://api.washandwow.in";
}
