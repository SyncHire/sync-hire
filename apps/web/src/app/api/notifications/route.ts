import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "@/lib/auth-server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 },
      );
    }

    const storage = getStorage();
    const notifications = await storage.getNotifications(session.user.id);

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error(error, { api: "notifications", operation: "fetch" });
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
