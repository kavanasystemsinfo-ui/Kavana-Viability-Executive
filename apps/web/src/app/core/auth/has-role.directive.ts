import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from './auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  @Input()
  set appHasRole(roles: string[]) {
    // Clear previous view
    this.viewContainer.clear();
    
    // Check if user has any of the required roles
    const userRole = this.authService.role$();
    const hasRole = roles.some(role => userRole === role);
    
    // Create or destroy view based on authorization
    if (hasRole && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasRole && this.hasView) {
      this.hasView = false;
    }
  }
}