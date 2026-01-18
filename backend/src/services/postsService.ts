import { pool } from "../config/db";
import { cloudinaryService } from "./cloudinaryService";

interface GetPostsOptions {
  limit?: number;
  offset?: number;
  profileId?: number | null;
  ownerId?: number | null;
  search?: string | null;
}

export const createPost = async (
  profileId: number,
  description: string | null,
  source: string | null
): Promise<any> => {
  const query = `
    INSERT INTO posts (description, source, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id_posts;
  `;

  const { rows: postRows } = await pool.query(query, [description || null, source || null]);
  const postId = postRows[0].id_posts;

  // Link the post to the profile
  const linkQuery = `
    INSERT INTO profiles_posts (profiles_id_profiles, posts_id_posts)
    VALUES ($1, $2);
  `;

  await pool.query(linkQuery, [profileId, postId]);

  return { id_posts: postId, description, source };
};

export const updatePost = async (
  postId: number,
  description: string | null,
  source: string | null
): Promise<any> => {
  const query = `
    UPDATE posts
    SET description = $1, source = $2, created_at = created_at
    WHERE id_posts = $3
    RETURNING id_posts, description, source;
  `;

  const { rows } = await pool.query(query, [description || null, source || null, postId]);
  return rows[0] || { id_posts: postId, description, source };
};

export const getPosts = async ({
  limit = 10,
  offset = 0,
  profileId = null,
  ownerId = null,
  search = null
}: GetPostsOptions) => {
  const values: any[] = [];
  let paramCount = 0;

  // Add profileId as first parameter for use in WHERE clause and subquery
  values.push(profileId);
  paramCount++;

  // Build WHERE clause
  let whereClause = '';

  // Filter out current user's posts unless specifically requesting them
  if (ownerId === null) {
    whereClause = `WHERE pr.id_profiles IS DISTINCT FROM $${paramCount}`;
  } else if (ownerId > 0) {
    // Get posts from specific profile
    paramCount++;
    values.push(ownerId);
    whereClause = `WHERE pp.profiles_id_profiles = $${paramCount}`;
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    paramCount++;
    const searchParamIndex = paramCount;
    values.push(searchTerm, searchTerm, searchTerm); // Add searchTerm 3 times for the 3 search conditions
    paramCount += 2; // We added 3 terms, so increment by 2 more (already incremented by 1)
    
    const searchClause = `(p.description ILIKE $${searchParamIndex} OR pr.display_name ILIKE $${searchParamIndex + 1} OR pr.username ILIKE $${searchParamIndex + 2})`;
    
    if (whereClause) {
      whereClause += ` AND ${searchClause}`;
    } else {
      whereClause = `WHERE ${searchClause}`;
    }
  }

  paramCount++; // For LIMIT
  const limitParamIndex = paramCount;
  paramCount++; // For OFFSET
  const offsetParamIndex = paramCount;

  const query = `
    SELECT
      p.id_posts,
      p.description,
      p.source,

      pr.id_profiles,
      pr.display_name,
      pr.avatar,
      pr.updated_at,

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

    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
  `;

  values.push(limit, offset);

  const { rows } = await pool.query(query, values);
  
  // Generate avatar URLs for each post
  return rows.map(row => ({
    ...row,
    avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
  }));
};
