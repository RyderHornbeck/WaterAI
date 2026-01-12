export function usePaywallPackages(offerings) {
  const currentOffering = offerings?.current;

  const monthlyPackage = currentOffering?.availablePackages?.find(
    (pkg) =>
      pkg.packageType === "MONTHLY" ||
      pkg.identifier === "$rc_monthly" ||
      pkg.identifier?.toLowerCase().includes("monthly"),
  );

  const yearlyPackage = currentOffering?.availablePackages?.find(
    (pkg) =>
      pkg.packageType === "ANNUAL" ||
      pkg.identifier === "$rc_annual" ||
      pkg.identifier?.toLowerCase().includes("annual") ||
      pkg.identifier?.toLowerCase().includes("yearly"),
  );

  return { monthlyPackage, yearlyPackage };
}
