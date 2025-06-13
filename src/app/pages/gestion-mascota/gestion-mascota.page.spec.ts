import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestionMascotaPage } from './gestion-mascota.page';

describe('GestionMascotaPage', () => {
  let component: GestionMascotaPage;
  let fixture: ComponentFixture<GestionMascotaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GestionMascotaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
