import { pool } from "../db";

interface GetCommentsOptions {
  postId?: number;
  limit?: number;
  offset?: number;
}

export const getComments = async ({
  postId,
  limit = 20,
  offset = 0,
}: GetCommentsOptions) => {
  let query = `
    SELECT 
      c.content,
      pr.id_profiles as user_id,
      pr.display_name,
      pr.avatar,
    FROM comments c
    LEFT JOIN posts p 
      ON c.posts_id_posts = p.id_posts
    LEFT JOIN profiles pr 
      ON c.id_profile = pr.id_profiles

  `;

  const values: any[] = [];

  if (postId) {
    query += `
      WHERE pp.profiles_id_profiles = $1
    `;
    values.push(postId);
  }

  query += `
    GROUP BY p.id_posts, pr.id_profiles, pr.display_name, pr.avatar
    ORDER BY c.id_comments DESC
    
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  values.push(limit, offset);

  const { rows } = await pool.query(query, values);
  return rows;
};
