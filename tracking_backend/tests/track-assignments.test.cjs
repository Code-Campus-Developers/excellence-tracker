// Uses the configured database, with all fixtures and writes rolled back.
// Run: node -r ts-node/register/transpile-only --test tests/track-assignments.test.cjs
require("dotenv").config();
const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const prismaModule = require("../src/lib/prisma");
const prisma = prismaModule.default;
const email = require("../src/lib/email");
const { default: assignments, getCurrentInstructorForTrack: resolveInstructor } = require("../src/routes/track-assignments");
const messages = require("../src/routes/messages").default;
const { notifyTrackInstructor } = require("../src/routes/notifications");

async function call(router, method, path, body = {}, params = {}, user = { role: "ADMIN", userId: "test-admin" }) {
  const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route;
  const response = { statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
  await route.stack.at(-1).handle({ body, params, user }, response);
  return response;
}

test("student assignment routing and updates (transaction rolled back)", async (t) => {
  const rollback = new Error("ROLL_BACK_TEST_FIXTURES");
  const suffix = randomUUID();
  const track = `Assignment test ${suffix}`;
  const emails = mock.method(email, "sendTrackInstructorAssignedEmail", async () => {});
  try {
    await prisma.$transaction(async (tx) => {
      // Exercise real database queries while keeping route writes in this transaction.
      prismaModule.default = tx;
      const mentor = async (name, isActive = true) => tx.user.create({ data: {
        name, email: `${name}-${suffix}@example.invalid`, role: "MENTOR", track, isActive,
      } });
      const general = await mentor("general");
      const personal = await mentor("personal");
      const replacement = await mentor("replacement");
      const inactive = await mentor("inactive", false);
      const student = async (name, studentTrack = track, isArchived = false) => {
        const user = await tx.user.create({ data: { name, email: `${name}-${suffix}@example.invalid`, role: "STUDENT" } });
        return tx.student.create({ data: { id: `${name}-${suffix}`, studentCode: `${name}-${suffix}`, name, email: user.email, track: studentTrack, isArchived, userId: user.id } });
      };
      const alice = await student("alice");
      const bob = await student("bob");
      const otherCourse = await student("other-course", `${track}-other`);
      const archived = await student("archived", track, true);
      const day = 86400000;
      const now = Date.now();
      const create = (instructor, studentIds, startDays, endDays = null) => tx.trackAssignment.create({ data: {
        instructorId: instructor.id, track, courseTrack: "HTML/CSS", studentIds,
        startDate: new Date(now + startDays * day), endDate: endDays === null ? null : new Date(now + endDays * day),
      } });
      await create(general, [], -1);
      const targeted = await create(personal, [alice.id], -5);

      await t.test("specific assignment beats a newer course-wide assignment", async () => {
        assert.equal((await resolveInstructor(track, alice.id)).id, personal.id);
      });
      await t.test("unselected students and course lookups retain the general instructor", async () => {
        assert.equal((await resolveInstructor(track, bob.id)).id, general.id);
        assert.equal((await resolveInstructor(track)).id, general.id);
      });
      await t.test("future, expired, inactive and other-course assignments do not override", async () => {
        await create(replacement, [alice.id], 1);
        await create(replacement, [alice.id], -2, -1);
        await create(inactive, [alice.id], -1);
        await tx.trackAssignment.create({ data: { instructorId: replacement.id, track: `${track}-other`, studentIds: [alice.id], startDate: new Date(now - day) } });
        assert.equal((await resolveInstructor(track, alice.id)).id, personal.id);
      });
      await t.test("chat lookup, conversation access and notifications use the selected instructor", async () => {
        const user = { role: "STUDENT", userId: alice.userId };
        const lookup = await call(messages, "get", "/instructor", {}, {}, user);
        assert.equal(lookup.body.id, personal.id);
        const allowed = await call(messages, "get", "/thread/:userId", {}, { userId: personal.id }, user);
        assert.equal(allowed.statusCode, 200);
        const rejected = await call(messages, "get", "/thread/:userId", {}, { userId: general.id }, user);
        assert.equal(rejected.statusCode, 403);
        await notifyTrackInstructor(alice.id, suffix);
        assert.equal((await tx.notification.findFirst({ where: { message: suffix } })).userId, personal.id);
      });
      const payload = { instructorId: replacement.id, track, courseTrack: "Python", startDate: new Date(now - day).toISOString() };
      await t.test("rejects malformed, missing, archived and other-course students", async () => {
        for (const studentIds of [null, "all", [123], ["missing"], [otherCourse.id], [archived.id]]) {
          const response = await call(assignments, "post", "/", { ...payload, studentIds });
          assert.equal(response.statusCode, 400, JSON.stringify(studentIds));
        }
      });
      await t.test("creation stores multiple selected students and limits assignment emails", async () => {
        const response = await call(assignments, "post", "/", { ...payload, studentIds: [alice.id, bob.id, alice.id] });
        assert.equal(response.statusCode, 201);
        assert.deepEqual(response.body.studentIds.sort(), [alice.id, bob.id].sort());
        assert.deepEqual(emails.mock.calls.map((item) => item.arguments[0].to).sort(), [alice.email, bob.email].sort());
        assert.equal((await resolveInstructor(track, alice.id)).id, replacement.id);
        await tx.trackAssignment.delete({ where: { id: response.body.id } });
      });
      await t.test("edits save the replacement instructor and preserve omitted student selection", async () => {
        const response = await call(assignments, "put", "/:id", { instructorId: replacement.id, notes: "Updated" }, { id: targeted.id });
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.instructorId, replacement.id);
        assert.deepEqual(response.body.studentIds, [alice.id]);
        assert.equal((await resolveInstructor(track, alice.id)).id, replacement.id);
      });
      await t.test("changing course cannot silently retain students from another course", async () => {
        const response = await call(assignments, "put", "/:id", { track: `${track}-other` }, { id: targeted.id });
        assert.equal(response.statusCode, 400);
      });
      await t.test("clearing students restores course-wide assignment behaviour", async () => {
        const response = await call(assignments, "put", "/:id", { studentIds: [], startDate: new Date(now - 1000).toISOString() }, { id: targeted.id });
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body.studentIds, []);
        assert.equal((await resolveInstructor(track, bob.id)).id, replacement.id);
      });
      await t.test("legacy creation without studentIds still works", async () => {
        const response = await call(assignments, "post", "/", payload);
        assert.equal(response.statusCode, 201);
        assert.deepEqual(response.body.studentIds, []);
      });
      await t.test("no active assignments retains the legacy mentor fallback", async () => {
        await tx.trackAssignment.deleteMany({ where: { track } });
        const result = await resolveInstructor(track, bob.id);
        assert.ok([general.id, personal.id, replacement.id].includes(result.id));
      });
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    prismaModule.default = prisma;
    mock.restoreAll();
    assert.equal(await prisma.user.count({ where: { email: { endsWith: `${suffix}@example.invalid` } } }), 0);
    await prisma.$disconnect();
  }
});
