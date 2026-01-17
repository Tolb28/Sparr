import { pool } from "../config/db";

interface GetPostsOptions {
  limit?: number;
  offset?: number;
  profileId?: number | null;
  ownerId?: number | null;
}

export const getPosts = async ({
  limit = 10,
  offset = 0,
  profileId = null,
  ownerId = null
}: GetPostsOptions) => {
  const query = `
    SELECT
      p.id_posts,
      p.description,
      p.source,

      pr.id_profiles,
      pr.display_name,
      pr.avatar,

      COALESCE(i.likes_count, 0)    AS likes_count,
      COALESCE(i.dislikes_count, 0) AS dislikes_count,
      COALESCE(c.comments_count, 0) AS comments_count,

      i.user_interaction

    FROM posts p 

    /* -------- POST OWNER -------- */
    JOIN profiles_posts pp
      ON pp.posts_id_posts = p.id_posts
    JOIN profiles pr
      ON pr.id_profiles = pp.profiles_id_profiles

    /* -------- INTERACTIONS AGGREGATE -------- */
    LEFT JOIN (
      SELECT
        i.posts_id_posts,
        COUNT(*) FILTER (WHERE it.title = 'like')    AS likes_count,
        COUNT(*) FILTER (WHERE it.title = 'dislike') AS dislikes_count,
        MAX(it.title) FILTER (
          WHERE i.profiles_id_profiles = $1
        ) AS user_interaction
      FROM interactions i
      JOIN interaction_type it
        ON it.id_interaction_type = i.interaction_type_idinteraction_type
      GROUP BY i.posts_id_posts
    ) i
      ON i.posts_id_posts = p.id_posts

    /* -------- COMMENTS AGGREGATE -------- */
    LEFT JOIN (
      SELECT
        posts_id_posts,
        COUNT(*) AS comments_count
      FROM comments
      GROUP BY posts_id_posts
    ) c
      ON c.posts_id_posts = p.id_posts

    WHERE pr.id_profiles IS DISTINCT FROM $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const values = [profileId, limit, offset];

  const { rows } = await pool.query(query, values);
  return rows;
};
