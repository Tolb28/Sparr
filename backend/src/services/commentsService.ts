import { pool } from "../db";

interface GetCommentsOptions {
  postId: number;
  limit?: number;
  offset?: number;
  profileId?: number | null;
}

export const getComments = async ({
  postId,
  limit = 20,
  offset = 0,
  profileId = null,
}: GetCommentsOptions) => {
  const query = `
    SELECT
      c.id_comments,
      c.content,
      c.created_at,

      pr.id_profiles        AS user_id,
      pr.display_name,
      pr.avatar,

      COALESCE(i.likes_count, 0)    AS likes_count,
      COALESCE(i.dislikes_count, 0) AS dislikes_count,
      i.user_interaction

    FROM comments c

    /* -------- COMMENT OWNER -------- */
    LEFT JOIN profiles pr
      ON pr.id_profiles = c.id_profile

    /* -------- INTERACTIONS AGGREGATE -------- */
    LEFT JOIN (
      SELECT
        i.comments_id_comments,
        COUNT(*) FILTER (WHERE it.title = 'like')    AS likes_count,
        COUNT(*) FILTER (WHERE it.title = 'dislike') AS dislikes_count,
        MAX(it.title) FILTER (
          WHERE i.profiles_id_profiles = $1
        ) AS user_interaction
      FROM interactions i
      JOIN interaction_type it
        ON it.id_interaction_type = i.interaction_type_idinteraction_type
      GROUP BY i.comments_id_comments
    ) i
      ON i.comments_id_comments = c.id_comments

    WHERE c.posts_id_posts = $2

    ORDER BY c.created_at DESC
    LIMIT $3 OFFSET $4;
  `;

  const values = [profileId, postId, limit, offset];

  const { rows } = await pool.query(query, values);
  return rows;
};
