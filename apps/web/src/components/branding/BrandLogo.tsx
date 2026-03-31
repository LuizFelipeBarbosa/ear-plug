import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandTheme = "auto" | "light" | "dark";

interface BrandAssetProps {
  className?: string;
  theme?: BrandTheme;
  priority?: boolean;
  decorative?: boolean;
  sizes?: string;
}

interface RenderBrandAssetProps extends BrandAssetProps {
  lightSrc: string;
  darkSrc: string;
  width: number;
  height: number;
}

function renderAssetClassName(theme: BrandTheme, variant: "light" | "dark"): string {
  if (theme === "light") {
    return variant === "light" ? "block h-auto w-full" : "hidden";
  }

  if (theme === "dark") {
    return variant === "dark" ? "block h-auto w-full" : "hidden";
  }

  return variant === "light"
    ? "block h-auto w-full dark:hidden"
    : "hidden h-auto w-full dark:block";
}

function BrandAsset({
  className,
  theme = "auto",
  priority = false,
  decorative = false,
  sizes,
  lightSrc,
  darkSrc,
  width,
  height,
}: RenderBrandAssetProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={lightSrc}
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={renderAssetClassName(theme, "light")}
      />
      <Image
        src={darkSrc}
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={renderAssetClassName(theme, "dark")}
      />
      {!decorative ? <span className="sr-only">EarPlug</span> : null}
    </span>
  );
}

export function BrandWordmark(props: BrandAssetProps) {
  return (
    <BrandAsset
      {...props}
      lightSrc="/branding/earplug-wordmark-light.png"
      darkSrc="/branding/earplug-wordmark-dark.png"
      width={2000}
      height={2000}
    />
  );
}

export function BrandMark(props: BrandAssetProps) {
  return (
    <BrandAsset
      {...props}
      lightSrc="/branding/earplug-mark-light.png"
      darkSrc="/branding/earplug-mark-dark.png"
      width={1500}
      height={1200}
    />
  );
}
