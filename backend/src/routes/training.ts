import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  createDrill,
  getDrills,
  getDrill,
  updateDrill,
  deleteDrill,
} from "../controllers/drillsController";
import {
  createTechnique,
  getTechniques,
  getTechnique,
  updateTechnique,
  deleteTechnique,
} from "../controllers/techniquesController";
import {
  createCombination,
  getCombinations,
  getCombination,
  updateCombination,
  deleteCombination,
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
} from "../controllers/trainingsController";
import {
  createCalendar,
  addTrainingToCalendar,
  getCalendar,
  listPublicCalendars,
  selectCalendarForProfile,
  getSelectedCalendarForProfile,
  updateCalendar,
  deleteCalendar,
  deleteTrainingFromCalendar,
} from "../controllers/trainingCalendarsController";

const router = Router();

// Drills
router.get("/drills", getDrills);
router.post("/drills", authenticate, createDrill);
router.get("/drills/:id", getDrill);
router.put("/drills/:id", authenticate, updateDrill);
router.delete("/drills/:id", authenticate, deleteDrill);

// Techniques
router.get("/techniques", getTechniques);
router.post("/techniques", authenticate, createTechnique);
router.get("/techniques/:id", getTechnique);
router.put("/techniques/:id", authenticate, updateTechnique);
router.delete("/techniques/:id", authenticate, deleteTechnique);

// Combinations
router.get("/combinations", getCombinations);
router.post("/combinations", authenticate, createCombination);
router.get("/combinations/:id", getCombination);
router.put("/combinations/:id", authenticate, updateCombination);
router.delete("/combinations/:id", authenticate, deleteCombination);

// Trainings
router.get("/trainings", getTrainings);
router.post("/trainings", authenticate, createTraining);
router.get("/trainings/:id", getTraining);
router.post("/trainings/:id/components", authenticate, addTrainingComponent);
router.put("/trainings/components/:compId", authenticate, updateTrainingComponent);
router.delete("/trainings/components/:compId", authenticate, deleteTrainingComponent);

// Training calendars
router.post("/calendars", authenticate, createCalendar);
router.get("/calendars/public", listPublicCalendars);
router.get("/calendars/selected", authenticate, getSelectedCalendarForProfile);
router.get("/calendars/:id", getCalendar);
router.post("/calendars/:id/trainings", authenticate, addTrainingToCalendar);
router.delete("/calendars/:calId/trainings/:itemId", authenticate, deleteTrainingFromCalendar);
router.put("/calendars/:id", authenticate, updateCalendar);
router.delete("/calendars/:id", authenticate, deleteCalendar);
router.post("/calendars/:id/select", authenticate, selectCalendarForProfile);

export default router;
