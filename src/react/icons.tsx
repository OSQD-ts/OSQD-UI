import type { SVGProps } from "react";
import { type IconName, icons } from "../icons/index";

/** Props of the named icon components below; `<Icon name>` in Icon.tsx is the general form. */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(displayName: string, name: IconName) {
  const Component = ({ size = 16, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
  Component.displayName = displayName;
  return Component;
}

export const CloseIcon = make("CloseIcon", "close");
export const CheckIcon = make("CheckIcon", "check");
export const InfoIcon = make("InfoIcon", "info");
export const WarningIcon = make("WarningIcon", "warning");
export const ErrorIcon = make("ErrorIcon", "error");
export const SuccessIcon = make("SuccessIcon", "success");
export const ChevronDownIcon = make("ChevronDownIcon", "chevron-down");
export const ChevronRightIcon = make("ChevronRightIcon", "chevron-right");
export const ChevronLeftIcon = make("ChevronLeftIcon", "chevron-left");
export const SearchIcon = make("SearchIcon", "search");
export const PlusIcon = make("PlusIcon", "plus");
export const MoreIcon = make("MoreIcon", "more-horizontal");
export const SettingsIcon = make("SettingsIcon", "settings");
