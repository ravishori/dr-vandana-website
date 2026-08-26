export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerConfigAtStartup } = await import(
      "@/config/validate-server-config"
    );
    validateServerConfigAtStartup();
  }
}
