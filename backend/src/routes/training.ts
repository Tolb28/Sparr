import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  createDrill,
  getDrills,
  getDrill,
  updateDrill,
  deleteDrill,
  getDrillsGrouped,
  getDrillPreview,
} from "../controllers/drillsController";
import {
  createTechnique,
  getTechniques,
  getTechnique,
  updateTechnique,
  deleteTechnique,
  getTechniquesGrouped,
  getTechniquePreview,
} from "../controllers/techniquesController";
import {
  createCombination,
  getCombinations,
  getCombination,
  updateCombination,
  deleteCombination,
  getCombinationsGrouped,
  getCombinationPreview,
} from "../controllers/combinationsController";
import {
  createTraining,
  getTrainings,
  getTraining,
  updateTraining,
  deleteTraining,
  addTrainingComponent,
  updateTrainingComponent,
  deleteTrainingComponent,
  reorderTrainingComponents,
  getPersonalizedContentRecommendations,
} from "../controllers/trainingsController";
import {
  createCalendar,
  addTrainingToCalendar,
  getCalendar,
  getCalendarPreview,
  listPublicCalendars,
  listUserCalendars,
  selectCalendarForProfile,
  getSelectedCalendarForProfile,
  updateCalendar,
  deleteCalendar,
  deleteTrainingFromCalendar,
  reorderCalendarTrainings,
  getWeeklyStats,
} from "../controllers/trainingCalendarsController";

const router = Router();

// Drills
router.get("/drills", getDrills);
router.get("/drills/grouped", getDrillsGrouped);
router.get("/drills/:id/preview", getDrillPreview);
router.post("/drills", authenticate, createDrill);
router.get("/drills/:id", getDrill);
router.put("/drills/:id", authenticate, updateDrill);
router.delete("/drills/:id", authenticate, deleteDrill);

// Techniques
router.get("/techniques", getTechniques);
router.get("/techniques/grouped", getTechniquesGrouped);
router.get("/techniques/:id/preview", getTechniquePreview);
router.post("/techniques", authenticate, createTechnique);
router.get("/techniques/:id", getTechnique);
router.put("/techniques/:id", authenticate, updateTechnique);
router.delete("/techniques/:id", authenticate, deleteTechnique);

// Combinations
router.get("/combinations", getCombinations);
router.get("/combinations/grouped", getCombinationsGrouped);
router.get("/combinations/:id/preview", getCombinationPreview);
router.post("/combinations", authenticate, createCombination);
router.get("/combinations/:id", getCombination);
router.put("/combinations/:id", authenticate, updateCombination);
router.delete("/combinations/:id", authenticate, deleteCombination);

// Trainings
router.get("/recommendations", authenticate, getPersonalizedContentRecommendations);
router.get("/trainings", getTrainings);
router.post("/trainings", authenticate, createTraining);
router.get("/trainings/:id", getTraining);
router.put("/trainings/:id", authenticate, updateTraining);
router.delete("/trainings/:id", authenticate, deleteTraining);
router.post("/trainings/:id/components", authenticate, addTrainingComponent);
router.put("/trainings/:id/components/reorder", authenticate, reorderTrainingComponents);
router.put("/trainings/components/:compId", authenticate, updateTrainingComponent);
router.delete("/trainings/components/:compId", authenticate, deleteTrainingComponent);

// Training calendars
router.post("/calendars", authenticate, createCalendar);
router.get("/calendars/public", authenticate, listPublicCalendars);
router.get("/calendars/mine", authenticate, listUserCalendars);
router.get("/calendars/selected", authenticate, getSelectedCalendarForProfile);
router.get("/calendars/week-stats", authenticate, getWeeklyStats);
router.get("/calendars/:id", getCalendar);
router.get("/calendars/:id/preview", authenticate, getCalendarPreview);
router.post("/calendars/:id/trainings", authenticate, addTrainingToCalendar);
router.put("/calendars/:id/trainings/reorder", authenticate, reorderCalendarTrainings);
router.delete("/calendars/:calId/trainings/:itemId", authenticate, deleteTrainingFromCalendar);
router.put("/calendars/:id", authenticate, updateCalendar);
router.delete("/calendars/:id", authenticate, deleteCalendar);
router.post("/calendars/:id/select", authenticate, selectCalendarForProfile);

export default router;
