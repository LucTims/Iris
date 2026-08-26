import { NextResponse } from "next/server";
import { callAdminRpc } from "@/lib/admin/rpc";

export async function GET() {
  const { data, error } = await callAdminRpc("get_admin_ledger");
  if (error) return error;
  return NextResponse.json({ ledger: data || [] });
}
