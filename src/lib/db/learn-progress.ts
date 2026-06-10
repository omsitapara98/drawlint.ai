import clientPromise from "./mongodb";

const DB_NAME = "drawlint-db";
const COLLECTION = "learn_progress";

/** One document per user holding the set of completed lesson slugs. */
interface LearnProgressDoc {
  userId: string;
  completed: string[];
  updatedAt: Date;
}

async function progressCol() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<LearnProgressDoc>(COLLECTION);
}

/** Return the list of completed lesson slugs for a user (empty if none). */
export async function getCompletedLessons(userId: string): Promise<string[]> {
  const col = await progressCol();
  const doc = await col.findOne({ userId });
  return doc?.completed ?? [];
}

/**
 * Mark a lesson complete or incomplete for a user.
 * Returns the updated list of completed slugs.
 */
export async function setLessonCompleted(
  userId: string,
  slug: string,
  completed: boolean,
): Promise<string[]> {
  const col = await progressCol();
  if (completed) {
    await col.updateOne(
      { userId },
      {
        $addToSet: { completed: slug },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  } else {
    await col.updateOne(
      { userId },
      {
        $pull: { completed: slug },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }
  return getCompletedLessons(userId);
}
