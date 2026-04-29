import { Request, Response } from 'express';
import { getNearbyClubs, getPopularTrainings, getSuggestedBoxers, getPopularCalendars } from '../services/recommendationsService';
import { pool } from '../config/db';

export const getRecommendationsController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - profileId is injected by auth middleware
    const profileId: number | undefined = req.profileId ?? (req.headers['x-profile-id'] ? parseInt(req.headers['x-profile-id'] as string, 10) : undefined);

    if (!profileId) {
      res.status(400).json({ success: false, message: 'Profile ID required' });
      return;
    }

    // Fetch user's location, style, and weight class
    const profileQuery = `
      SELECT location, boxing_style_id_boxing_style, weight_class_id_weight_class
      FROM profiles
      WHERE id_profiles = $1
    `;
    const { rows: profileRows } = await pool.query(profileQuery, [profileId]);
    const profile = profileRows[0];

    if (!profile) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    const userLocation: string | null = profile.location ?? null;
    const style: number | null = profile.boxing_style_id_boxing_style ?? null;
    const weightClass: number | null = profile.weight_class_id_weight_class ?? null;

    // Parse limits from query params with defaults
    const clubsLimit = Math.min(parseInt(req.query.clubsLimit as string, 10) || 5, 20);
    const trainingsLimit = Math.min(parseInt(req.query.trainingsLimit as string, 10) || 10, 50);
    const boxersLimit = Math.min(parseInt(req.query.boxersLimit as string, 10) || 10, 50);
    const calendarsLimit = Math.min(parseInt(req.query.calendarsLimit as string, 10) || 5, 20);

    // Call all four service functions
    const [nearbyClubs, popularTrainings, suggestedBoxers, popularCalendars] = await Promise.all([
      getNearbyClubs(userLocation, clubsLimit),
      getPopularTrainings(trainingsLimit),
      getSuggestedBoxers(profileId, style, weightClass, userLocation, boxersLimit),
      getPopularCalendars(calendarsLimit),
    ]);

    res.json({
      success: true,
      recommendations: {
        nearbyClubs,
        popularTrainings,
        suggestedBoxers,
        popularCalendars,
      },
    });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
