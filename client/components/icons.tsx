import { ComponentPropsWithoutRef } from "react";

type IconName =
  | "sparkles"
  | "rocket"
  | "home"
  | "clock"
  | "play"
  | "trophy"
  | "chart"
  | "mail"
  | "shield"
  | "users"
  | "bolt"
  | "crown"
  | "check"
  | "question"
  | "layers"
  | "logout"
  | "plus"
  | "trash"
  | "eye"
  | "eyeOff";

interface IconProps extends ComponentPropsWithoutRef<"svg"> {
  name: IconName;
}

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {getIconPath(name)}
    </svg>
  );
}

function getIconPath(name: IconName) {
  switch (name) {
    case "sparkles":
      return (
        <>
          <path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3z" />
          <path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z" />
          <path d="M19 13l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13z" />
        </>
      );
    case "rocket":
      return (
        <>
          <path d="M5 19c2.5-.5 4.5-2.5 5-5l5-5c1.7-1.7 3.8-2.8 6-3-.2 2.2-1.3 4.3-3 6l-5 5c-2.5.5-4.5 2.5-5 5H5v-3z" />
          <path d="M13 11l2 2" />
          <path d="M6 18l-2 2" />
        </>
      );
    case "home":
      return (
        <>
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M10 21v-6h4v6" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 2" />
        </>
      );
    case "play":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.8l5.4 3.2L10 15.2V8.8z" />
        </>
      );
    case "trophy":
      return (
        <>
          <path d="M8 4h8v2a4 4 0 01-8 0V4z" />
          <path d="M8 5H5a2 2 0 002 4h1" />
          <path d="M16 5h3a2 2 0 01-2 4h-1" />
          <path d="M12 10v4" />
          <path d="M9 21h6" />
          <path d="M10 18h4v3h-4z" />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-6" />
          <path d="M22 20v-9" />
        </>
      );
    case "mail":
      return (
        <>
          <rect height="14" rx="3" width="18" x="3" y="5" />
          <path d="M4 7l8 6 8-6" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3l7 3v5c0 4.4-2.9 8.5-7 10-4.1-1.5-7-5.6-7-10V6l7-3z" />
          <path d="M9.5 12l1.8 1.8L14.8 10" />
        </>
      );
    case "users":
      return (
        <>
          <path d="M16.5 19a4.5 4.5 0 00-9 0" />
          <circle cx="12" cy="10" r="3" />
          <path d="M19.5 18a3.5 3.5 0 00-3-3.4" />
          <path d="M7.5 14.6A3.5 3.5 0 004.5 18" />
        </>
      );
    case "bolt":
      return (
        <>
          <path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z" />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M4 18l1.5-9L11 13l4-7 3.5 3L20 18H4z" />
          <path d="M4 18h16" />
        </>
      );
    case "check":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.3 2.3 4.7-5.1" />
        </>
      );
    case "question":
      return (
        <>
          <path d="M9.2 8.8a3.2 3.2 0 116 1.2c0 1.8-1.8 2.4-2.7 3.3-.4.4-.6.8-.6 1.7" />
          <path d="M12 17.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </>
      );
    case "layers":
      return (
        <>
          <path d="M12 4l8 4-8 4-8-4 8-4z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 16l8 4 8-4" />
        </>
      );
    case "logout":
      return (
        <>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case "trash":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" />
          <path d="M7.5 7l.8 11a2 2 0 002 1.9h1.4a2 2 0 002-1.9l.8-11" />
          <path d="M10 11.2v4.8" />
          <path d="M14 11.2v4.8" />
        </>
      );
    case "eye":
      return (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.7" />
        </>
      );
    case "eyeOff":
      return (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.3A10.7 10.7 0 0112 6c6 0 9.5 6 9.5 6a17.6 17.6 0 01-4 4.4" />
          <path d="M6.5 6.6A17.3 17.3 0 002.5 12s3.5 6 9.5 6c1.4 0 2.8-.3 4-.9" />
          <path d="M10 10a2.9 2.9 0 004 4" />
        </>
      );
    default:
      return null;
  }
}
