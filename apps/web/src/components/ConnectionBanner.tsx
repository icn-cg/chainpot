"use client";
import React from "react";

type Props = {
  show: boolean;
  message: string;
};

export default function ConnectionBanner({ show, message }: Props) {
  if (!show) return null;
  return (
    <div className="border border-gray-200 rounded p-2 text-center text-gray-600 bg-gray-50">
      {message}
    </div>
  );
}
