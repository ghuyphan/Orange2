import * as SQLite from 'expo-sqlite';
import UserRecord from '@/types/userType';
import pb from '@/services/pocketBase';

// Function to open the database
export async function openDatabase() {
    try {
        const db = await SQLite.openDatabaseAsync('myDatabase.db', {
            useNewConnection: true
        });
        if (!db) {
            throw new Error("Database not initialized");
        }
        return db;
    } catch (error) {
        console.error('Error opening database:', error);
        throw error;
    }
}

// Function to create the "users" table
export async function createTable() {
    const db = await openDatabase();
    if (!db) {
        throw new Error('Database not initialized');
    }

    try {
        // Use db.runAsync for single statements
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY NOT NULL,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                verified INTEGER NOT NULL,
                name TEXT,
                avatar TEXT
            );
        `);        
    } catch (error) {
        console.error('Error creating table:', error);
        throw error;
    }
}

// Function to insert a new user into the "users" table
export async function insertUser(userData: {
    id: string;
    username: string;
    email: string;
    verified: boolean;
    name?: string;
    avatar?: object; // Changed from string to object
}) {
    const db = await openDatabase();
    if (!db) {
        throw new Error('Database failed to open.');
    }

    try {
        // Check if the user already exists
        const existingUser = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [userData.id]);

        // Convert boolean to integer
        const verifiedValue = userData.verified ? 1 : 0;

        // Convert avatar object to JSON string
        const avatarString = userData.avatar ? JSON.stringify(userData.avatar) : null;

        if (existingUser) {
            // Update the existing user's data
            await db.runAsync(
                'UPDATE users SET username = ?, email = ?, verified = ?, name = ?, avatar = ? WHERE id = ?',
                [
                    userData.username,
                    userData.email,
                    verifiedValue,
                    userData.name ?? null,
                    avatarString,
                    userData.id,
                ]
            );
        } else {
            // Insert the new user
            await db.runAsync(
                'INSERT INTO users (id, username, email, verified, name, avatar) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    userData.id,
                    userData.username,
                    userData.email,
                    verifiedValue,
                    userData.name ?? null,
                    avatarString,
                ]
            );
        }
    } catch (error) {
        console.error('Error inserting/updating user:', error);
        throw error;
    }
}

// Function to retrieve all users from the "users" table
export async function getAllUsers() {
    const db = await openDatabase();
    if (!db) {
        throw new Error('Database failed to open.');
    }

    try {
        // Specify the expected type for the result
        const users = await db.getAllAsync<UserRecord>('SELECT * FROM users');
        // Correctly type the `user` parameter in the forEach loop
        users.forEach((user: UserRecord) => {
             (`User: ${user.username}, Email: ${user.email}`);
        });

        return users; // Return users if needed elsewhere
    } catch (error) {
        console.error('Error retrieving users:', error);
        throw error;
    }
}

export async function updateUserInTransaction(userId: string, newUsername: string) {
    const db = await openDatabase();
    if (!db) {
        throw new Error('Database failed to open.');
    }

    try {
        await db.withTransactionAsync(async () => {
            await db.runAsync('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);
            const updatedUser = await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [userId]);
        });
    } catch (error) {
        console.error('Error updating user in transaction:', error);
        throw error;
    }
}


export async function getUserById(userId: string) {
    const db = await openDatabase();
    if (!db) {
        throw new Error('Database failed to open.');
    }

    try {
        const user = await db.getFirstAsync<UserRecord>('SELECT * FROM users WHERE id = ?', [userId]);
        if (user) {
            return user;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error retrieving user by ID:', error);
        throw error;
    }
}

export async function getEmailByUserID(userID: string): Promise<string | null> {
    const db = await openDatabase();
    try {
      const user = await db.getFirstAsync<{ email: string }>(
        'SELECT email FROM users WHERE id = ?',
        userID
      );
      return user?.email || null;
    } catch (error) {
      console.error('Error retrieving email by userID:', error);
      return null;
    }
  }
// Function to close the database
export async function closeDatabase() {
    const db = await openDatabase();
    try {
        await db.closeAsync();
    } catch (error) {
        console.error('Failed to close the database:', error);
        throw error;
    }
}
export async function updateUserAvatarCombined(
    userId: string,
    newAvatarConfig: object
  ) {
    // Update in local SQLite DB.
    const db = await openDatabase();
    if (!db) {
      throw new Error("Database not initialized");
    }
  
    try {
      await db.runAsync(
        "UPDATE users SET avatar = ? WHERE id = ?",
        [JSON.stringify(newAvatarConfig), userId]
      );
    } catch (error) {
      console.error("Error updating user avatar in local DB:", error);
      throw error;
    }
  
    // Update on Pocketbase.
    try {
      const response = await pb.collection("users").update(userId, {
        avatar: JSON.stringify(newAvatarConfig),
      });
      return response;
    } catch (error) {
      console.error("Error updating user avatar on Pocketbase:", error);
      throw error;
    }
  }