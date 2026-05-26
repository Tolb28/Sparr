import { Request, Response } from "express";
import * as calendarService from "../services/calendarService";

async function resolveProfileId(req: Request): Promise<number | null> {
  // @ts-ignore
  if (req.profileId) return req.profileId as number;
  // @ts-ignore
  const userId = req.userId;
  return calendarService.getProfileIdForUser(userId);
}

export const createCalendar = async (req: Request, res: Response) => {
  try {
    const profileId = await resolveProfileId(req);
    if (!profileId) return res.status(400).json({ error: "Profile required" });
    const { title, privacy, calendar_type, num_weeks, order_start_date } = req.body;
    const calendar = await calendarService.createCalendar(
      title,
      profileId,
      privacy,
      calendar_type,
      num_weeks,
      order_start_date
    );
    res.status(201).json({ calendar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const addTrainingToCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const { id_trainings, order, icon_name, week_number, day_of_week, start_time } = req.body;
    const item = await calendarService.addTrainingToCalendar(
      calId,
      id_trainings ?? null,
      order,
      icon_name,
      week_number,
      day_of_week,
      start_time
    );
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateCalendar = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const calId = parseInt(req.params.id as string, 10);
    const { title, privacy, calendar_type, num_weeks, order_start_date, replace_trainings } = req.body;

    const profileId = await calendarService.getProfileIdForUser(userId);
    if (!profileId) return res.status(400).json({ error: "Profile required" });

    // Check ownership
    const existing = await calendarService.getCalendarById(calId);
    if (!existing?.calendar) return res.status(404).json({ error: "Calendar not found" });

    const isOwner = existing.calendar.id_created_by === Number(profileId);

    if (!isOwner) {
      // Fork: create a personal copy with the requested changes applied
      const forked = await calendarService.forkCalendar(calId, profileId, { title, privacy });
      // Select the new calendar for this user
      await calendarService.selectCalendar(userId, forked.id_training_calendar);
      // If caller wants to replace slots (e.g. edit screen always re-submits), clear the forked copy's slots
      if (replace_trainings) {
        await calendarService.clearCalendarTrainings(forked.id_training_calendar);
      }
      return res.json({ calendar: forked, forked: true });
    }

    // If calendar type is changing OR caller explicitly requests slot replacement, clear all slots
    const typeChanging =
      calendar_type !== undefined &&
      calendar_type !== existing.calendar.calendar_type;

    if (typeChanging || replace_trainings) {
      await calendarService.clearCalendarTrainings(calId);
    }

    const calendar = await calendarService.updateCalendar(calId, {
      title,
      privacy,
      calendar_type,
      num_weeks,
      order_start_date,
    });
    if (!calendar) return res.status(400).json({ error: "No fields to update" });
    res.json({ calendar, type_changed: typeChanging });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    await calendarService.deleteCalendar(calId);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTrainingFromCalendar = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId as string, 10);
    await calendarService.removeTrainingFromCalendar(itemId);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCalendar = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const result = await calendarService.getCalendarById(calId);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCalendarPreview = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const calId = parseInt(req.params.id as string, 10);
    const result = await calendarService.getCalendarPreview(calId);
    if (!result) return res.status(404).json({ error: "Not found" });
    const profileId = await calendarService.getProfileIdForUser(userId);
    const is_owner = !!profileId && result.calendar.id_created_by === Number(profileId);
    res.json({ ...result, is_owner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const listPublicCalendars = async (_req: Request, res: Response) => {
  try {
    const calendars = await calendarService.listPublicCalendars();
    res.json({ calendars });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const listUserCalendars = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const calendars = await calendarService.listUserCalendars(userId);
    res.json({ calendars });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const selectCalendarForProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const calId = parseInt(req.params.id as string, 10);
    const profileId = await resolveProfileId(req);
    if (!profileId) return res.status(400).json({ error: "Profile not found" });
    const selected = await calendarService.selectCalendar(userId, calId, profileId);
    res.json({ selected });
  } catch (err: any) {
    console.error(err);
    res.status(err?.message === "Profile not found" ? 400 : 500).json({ error: err?.message || "Server error" });
  }
};

export const getSelectedCalendarForProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const profileId = await resolveProfileId(req);
    if (!profileId) return res.json({ calendar: null });
    const result = await calendarService.getSelectedCalendar(userId, profileId);
    if (!result) return res.json({ calendar: null });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const reorderCalendarTrainings = async (req: Request, res: Response) => {
  try {
    const calId = parseInt(req.params.id as string, 10);
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
    await calendarService.reorderCalendarTrainings(calId, orderedIds);
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getWeeklyStats = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const profileId = await calendarService.getProfileIdForUser(userId);
    if (!profileId) return res.status(400).json({ error: "Profile required" });
    
    // Get date from query params, default to today
    let dateStr = req.query.date as string;
    if (!dateStr) {
      const today = new Date();
      dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    const stats = await calendarService.getWeeklyStats(profileId, dateStr);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
