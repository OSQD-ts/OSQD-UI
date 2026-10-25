import type { SVGProps } from "react";
import { type IconName, iconAttrs, icons } from "../icons/index";
import { type IllustrationName, illustrations } from "../illustrations/index";
import { type Color, colorClass, cx } from "./cx";

export { type IconName, iconNames, icons, iconSvg } from "../icons/index";
export { type IllustrationName, illustrationNames, illustrations, illustrationSvg } from "../illustrations/index";

export interface IconComponentProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  name: IconName;
  /** Size in px; default 16. */
  size?: number;
  strokeWidth?: number;
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  title?: string;
  /** Intent colour; without it the icon takes the text colour. */
  color?: Color;
}

/** One icon from the set, inline. The markup is the kit's own, never user input. */
export function Icon({ name, size = 16, strokeWidth = 1.75, title, color, className, ...rest }: IconComponentProps) {
  const inner = (title ? `<title>${title.replace(/</g, "&lt;")}</title>` : "") + icons[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={iconAttrs.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx("oq-icon", color && "oq-text-c", colorClass(color), className)}
      style={{ width: size, height: size }}
      {...rest}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export interface IllustrationProps extends SVGProps<SVGSVGElement> {
  name: IllustrationName;
  /** Width in px; height follows the 4:3 frame. Default 160. */
  width?: number;
  title?: string;
}

/** A spot illustration for empty and error states; it recolours with the theme. */
export function Illustration({ name, width = 160, title, className, ...rest }: IllustrationProps) {
  const inner = (title ? `<title>${title.replace(/</g, "&lt;")}</title>` : "") + illustrations[name];
  return (
    <svg
      width={width}
      height={Math.round((width * 120) / 160)}
      viewBox="0 0 160 120"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx("oq-illustration", className)}
      {...rest}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
