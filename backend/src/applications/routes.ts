import { Router } from "express";
import { prisma } from "../db/client";
import {
  authenticateToken,
  requireRole,
  requireRegionScope,
} from "../common/middleware/auth";
import { AppState, Role } from "@prisma/client";
import { can, Transition } from "./fsm";
import { successResponse, errorResponse } from "../common/http";

const router = Router();

// Create draft (Company Rep)
router.post(
  "/",
  authenticateToken,
  requireRole(Role.COMPANY_REP, Role.ADMIN),
  async (req: any, res, next) => {
    try {
      const { companyId, regionId, form } = req.body;
      // optional: ensure user owns the company
      const app = await prisma.membershipApplication.create({
        data: {
          companyId,
          submittedById: req.user.id,
          regionId,
          form,
          state: AppState.DRAFT,
        },
      });
      return successResponse(
        res,
        app,
        "Application draft created successfully",
        201
      );
    } catch (error) {
      next(error);
    }
  }
);

// Submit draft
router.post(
  "/:id/submit",
  requireRole(Role.COMPANY_REP, Role.ADMIN),
  async (req: any, res) => {
    const app = await prisma.membershipApplication.findUnique({
      where: { id: req.params.id },
    });
    if (!app) return res.status(404).json({ message: "Not found" });
    if (!can(app.state, "submit"))
      return res.status(409).json({ message: "Invalid transition" });

    const updated = await prisma.$transaction(async (tx) => {
      const ua = await tx.membershipApplication.update({
        where: { id: app.id },
        data: { state: AppState.SUBMITTED, submittedAt: new Date() },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: ua.id,
          action: "submit",
          actorId: req.user.id,
          meta: {},
        },
      });
      return ua;
    });
    res.json(updated);
  }
);

// List (region-scoped for regional; global for national/admin)
router.get(
  "/",
  authenticateToken,
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT, Role.REGIONAL_SECRETARIAT),
  requireRegionScope,
  async (req: any, res, next) => {
    try {
      const { state, regionId } = req.query as any;
      const where: any = {};
      if (state) where.state = state as AppState;

      if (req.user.role === Role.REGIONAL_SECRETARIAT) {
        where.regionId = req.user.regionId;
      } else if (regionId) {
        where.regionId = regionId;
      }
      const apps = await prisma.membershipApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { company: true, region: true, submittedBy: true },
      });
      return successResponse(res, apps, "Applications retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Get by id
router.get(
  "/:id",
  requireRole(
    Role.ADMIN,
    Role.NATIONAL_SECRETARIAT,
    Role.REGIONAL_SECRETARIAT,
    Role.COMPANY_REP
  ),
  async (req: any, res) => {
    const app = await prisma.membershipApplication.findUnique({
      where: { id: req.params.id },
      include: { company: true, region: true, submittedBy: true, events: true },
    });
    if (!app) return res.status(404).json({ message: "Not found" });
    // If company rep, ensure they own the company
    if (req.user.role === Role.COMPANY_REP) {
      const owns = await prisma.company.findFirst({
        where: { id: app.companyId, ownerUserId: req.user.id },
      });
      if (!owns) return res.status(403).json({ message: "Forbidden" });
    }
    res.json(app);
  }
);

// Helper to perform transitions
async function transition(
  appId: string,
  actorId: string,
  action: Transition,
  data: any = {}
) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.membershipApplication.findUnique({
      where: { id: appId },
    });
    if (!app) throw new Error("Not found");
    if (!can(app.state, action)) throw new Error("Invalid transition");

    const nextState: Record<Transition, AppState> = {
      submit: AppState.SUBMITTED,
      request_info: AppState.REQUESTED_CHANGES,
      region_approve: AppState.NATIONAL_REVIEW,
      national_approve: AppState.APPROVED,
      reject: AppState.REJECTED,
    };
    const newState = nextState[action];

    const ua = await tx.membershipApplication.update({
      where: { id: appId },
      data: {
        state: newState,
        decidedAt: ["national_approve", "reject"].includes(action)
          ? new Date()
          : app.decidedAt,
        reasonRejected:
          action === "reject"
            ? data.reasonRejected ?? "Not specified"
            : app.reasonRejected,
      },
    });
    await tx.applicationEvent.create({
      data: { applicationId: appId, action, actorId, meta: data ?? {} },
    });
    return ua;
  });
}

// Request info (regional or national)
router.post(
  "/:id/request-info",
  requireRole(Role.REGIONAL_SECRETARIAT, Role.NATIONAL_SECRETARIAT, Role.ADMIN),
  async (req: any, res) => {
    try {
      const ua = await transition(req.params.id, req.user.id, "request_info", {
        note: req.body.note,
      });
      res.json(ua);
    } catch (e: any) {
      res.status(409).json({ message: e.message });
    }
  }
);

// Region approve
router.post(
  "/:id/region-approve",
  requireRole(Role.REGIONAL_SECRETARIAT, Role.ADMIN),
  async (req: any, res) => {
    // Optional: verify req.user.regionId matches application.regionId
    try {
      const ua = await transition(req.params.id, req.user.id, "region_approve");
      res.json(ua);
    } catch (e: any) {
      res.status(409).json({ message: e.message });
    }
  }
);

// National approve
router.post(
  "/:id/national-approve",
  requireRole(Role.NATIONAL_SECRETARIAT, Role.ADMIN),
  async (req: any, res) => {
    try {
      const ua = await transition(
        req.params.id,
        req.user.id,
        "national_approve"
      );
      res.json(ua);
    } catch (e: any) {
      res.status(409).json({ message: e.message });
    }
  }
);

// Reject
router.post(
  "/:id/reject",
  requireRole(Role.REGIONAL_SECRETARIAT, Role.NATIONAL_SECRETARIAT, Role.ADMIN),
  async (req: any, res) => {
    try {
      const ua = await transition(req.params.id, req.user.id, "reject", {
        reasonRejected: req.body.reasonRejected,
      });
      res.json(ua);
    } catch (e: any) {
      res.status(409).json({ message: e.message });
    }
  }
);

// Events
router.get(
  "/:id/events",
  requireRole(Role.ADMIN, Role.NATIONAL_SECRETARIAT, Role.REGIONAL_SECRETARIAT),
  async (req, res) => {
    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: req.params.id },
      orderBy: { at: "asc" },
    });
    res.json(events);
  }
);

export default router;
