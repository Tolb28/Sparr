import { pool } from "../db";

interface GetPostsOptions {
  userId?: number;
  limit?: number;
  offset?: number;
}

export const getPosts = async ({
  userId,
  limit = 20,
  offset = 0,
}: GetPostsOptions) => {
  let query = `
    SELECT 
      p.id_posts,
      p.description,
      p.source,
      pr.id_profiles as id_profiles,
      pr.display_name,
      pr.avatar,
      COUNT(i.posts_id_posts) FILTER (WHERE it.title = 'like') AS likes_count,
      COUNT(i.posts_id_posts) FILTER (WHERE it.title = 'dislike') AS dislikes_count,
      COUNT(i.posts_id_posts) FILTER (WHERE it.title = 'comment') AS comments_count
    FROM posts p
    LEFT JOIN interactions i 
      ON p.id_posts = i.posts_id_posts
    LEFT JOIN interaction_type it 
      ON i.interaction_type_idinteraction_type = it.id_interaction_type
    LEFT JOIN profiles_posts pp 
      ON p.id_posts = pp.posts_id_posts
    LEFT JOIN profiles pr 
      ON pr.id_profiles = pp.profiles_id_profiles

  `;

  const values: any[] = [];

  if (userId) {
    query += `
      INNER JOIN profiles_posts pp 
        ON p.id_posts = pp.posts_id_posts
      WHERE pp.profiles_id_profiles = $1
    `;
    values.push(userId);
  }

  query += `
    GROUP BY p.id_posts, pr.id_profiles, pr.display_name, pr.avatar
    ORDER BY p.id_posts DESC
    
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  values.push(limit, offset);

  const { rows } = await pool.query(query, values);
  return rows;
};
