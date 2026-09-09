import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// A single mapped object. Everything the tool records lives on this one row,
// and the columns map 1:1 onto the exported points.csv.
export const points = pgTable("points", {
  // Internal row key — never exported. A nanoid at runtime.
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // The exported ID#: "1", "2", … in sequential mode, or a 10-char nanoid
  // ("V1StGXR8Z5") when unique IDs are switched on.
  pointId: text("point_id").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  // Direction of travel approaching the point, stored as the exact token that
  // goes in the CSV so a file round-trips byte-for-byte: a cardinal heading
  // ("NB" | "SB" | "EB" | "WB") or a compass bearing in degrees ("0".."359").
  // Null / empty means no direction was recorded and no line is drawn.
  direction: text("direction"),
  description: text("description"),
  distanceFt: real("distance_ft").default(0),
});

export const insertPointSchema = createInsertSchema(points).omit({
  id: true,
}).extend({
  // Assigned from the current ID mode when omitted.
  pointId: z.string().optional(),
});

export type Point = typeof points.$inferSelect;
export type InsertPoint = z.infer<typeof insertPointSchema>;

export type OpenRoadData = {
  points: Point[];
};
