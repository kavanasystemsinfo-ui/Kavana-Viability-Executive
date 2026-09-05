import { Injectable, inject } from '@angular/core';
import { ClerkService } from 'ngx-clerk';
import { Role } from './role.enum';
import { signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private clerk = inject(ClerkService);

  // Signals - initialized as null, will be updated by components that need them
  readonly user$ = signal<unknown>(null);
  readonly role$ = signal<Role | null>(null);
  readonly companyId$ = signal<string | null>(null);

  /**
   * Check if the current user can perform the given action
   * based on their role.
   * This is a simplified version - in a real implementation,
   * we would derive role from Clerk claims.
   */
  can(action: 'read' | 'edit' | 'admin'): boolean {
    // For now, we'll check if user is signed in as a basic gate
    // Role-based logic will be implemented once we can extract claims from Clerk
    const role = this.role$();
    switch (action) {
      case 'read':
        return role !== null; // All logged-in roles can read
      case 'edit':
        return role === Role.Admin || role === Role.Analyst;
      case 'admin':
        return role === Role.Admin;
      default:
        return false;
    }
  }

  /**
   * Get the Clerk token for HTTP requests
   * Following the same pattern as auth.guard.ts
   */
  async getClerkToken(): Promise<string> {
    const CLERK_LOAD_TIMEOUT_MS = 5000;
    const deadline = Date.now() + CLERK_LOAD_TIMEOUT_MS;
    while (!this.clerk.isLoaded() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (this.clerk.isLoaded() && this.clerk.isSignedIn()) {
      const session = await this.clerk.session;
      // Assuming getToken() exists based on auth.guard pattern
      return (session as { getToken?: () => Promise<string> | string }).getToken?.() ?? '';
    }
    return '';
  }

  /**
   * Get the current user's display name (email) or a default
   */
  userDisplayName(): string {
    const user = this.user$();
    if (user && typeof user === 'object' && 'email' in user) {
      const email = (user as { email?: unknown }).email;
      if (typeof email === 'string') return email;
    }
    return 'Usuario';
  }

  /**
   * Check if the user is signed in
   */
  isSignedIn(): boolean {
    return this.clerk.isLoaded() && this.clerk.isSignedIn();
  }

  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    await this.clerk.signOut();
  }
}
