"use client";
import React from "react";
import "../lib/appkit"; // side-effect: initializes AppKit once

export default function ReownProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
