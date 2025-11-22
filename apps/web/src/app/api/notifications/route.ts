import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const storage = getStorage();
    const user = await storage.getCurrentUser();
    const notifications = await storage.getNotifications(user.id);

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
