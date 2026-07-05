import { ICenter } from './center.model';

export interface ICurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  mobile: string;
  email: string;
  is_callcenter: boolean;
  remember_token: string;
  menu_favoris: string;
  centers: ICenter[];
  employee?: any;
  mfaEnabled?: boolean;
}

export class CurrentUser implements ICurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  mobile: string;
  email: string;
  is_callcenter: boolean;
  remember_token: string;
  menu_favoris: string;
  centers: ICenter[];
  mfaEnabled?: boolean;

  constructor() {
    this.id = null;
    this.first_name = null;
    this.last_name = null;
    this.email = null;
    this.mobile = null;
    this.is_callcenter = false;
    this.remember_token = null;
    this.menu_favoris = null;
    this.centers = [];
    this.mfaEnabled = false;
  }
}
