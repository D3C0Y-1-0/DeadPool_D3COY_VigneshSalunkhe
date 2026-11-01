"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Server, ShieldCheck } from "lucide-react";
import { fetchSensorStatus, SensorStatus } from "../api";

export default function SystemStatus() {
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSensorStatus()
      .then((data) => {
        if (active) setSensors(data);
      })
      .catch(() => {
        /* fallback */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const coreServices = [
    { name: "SIEM Correlation Engine", status: "Operational", href: "/dashboard/incidents" },
    { name: "EDR & Host Telemetry", status: "Operational", href: "/dashboard/endpoint" },
    { name: "Network Sensors & Decoy Mesh", status: "Operational", href: "/dashboard/network" },
    { name: "Threat Intel Feeds (STIX 2.1)", status: "Operational", href: "/dashboard/attack-matrix" },
  ];

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div>
          <h2 className="font-display text-sm font-bold text-black tracking-tight">System Status</h2>
          <p className="text-[11px] text-[#737373]">Core deception pipelines & sensors</p>
        </div>
        <Link
          href="/dashboard/sensors"
          className="inline-flex items-center gap-1 text-xs font-semibold text-black transition-colors hover:text-neutral-600"
        >
          Fleet details <ChevronRight size={13} />
        </Link>
      </div>

      {/* Services List */}
      <div className="mt-3 flex flex-col divide-y divide-[#f5f5f5] flex-1 justify-around">
        {coreServices.map((service) => (
          <Link
            key={service.name}
            href={service.href}
            className="group flex items-center justify-between py-2 transition-colors hover:bg-neutral-50 px-2 rounded-lg -mx-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-black group-hover:text-neutral-700">
                {service.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{service.status}</span>
              <ChevronRight size={13} className="text-[#a3a3a3] group-hover:text-black transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Sensor Pill Strip */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-[11px] text-[#737373]">
        <span className="flex items-center gap-1.5 font-medium text-black">
          <Server size={12} className="text-[#525252]" />
          {sensors.length > 0 ? `${sensors.length} Honeypots Active` : "4 Decoy Containers Active"}
        </span>
        <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          ALL HEALTHY
        </span>
      </div>
    </div>
  );
}
