import {
  CurrentUser,
  ICenter,
  ICurrentUser,
  IJwtTokens,
  IWsError,
  JwtTokens,
  WsErrorClass,
} from '@app/models';
import { Action, createReducer, on } from '@ngrx/store';
import {
  GetCurrentUserError,
  GetCurrentUserSuccess,
  InitializeAuthState,
  LoginError,
  LoginMfaRequired,
  LoginSuccess,
  RefreshTokenError,
  RefreshTokenSuccess,
  ResetError,
  SetCurrentCenter,
  SetRefreshTokenInProgress,
  UpdateMenuFavorisError,
  UpdateMenuFavorisSuccess,
} from './auth.actions';

export interface AuthState {
  jwtTokens: IJwtTokens;
  refreshTokenInProgress: boolean;
  user: ICurrentUser;
  currentCenter: ICenter;
  errors?: IWsError;
  mfaRequired: boolean;
}

export const initialAuthState: AuthState = {
  jwtTokens: new JwtTokens(),
  refreshTokenInProgress: false,
  user: new CurrentUser(),
  currentCenter: null,
  errors: null,
  mfaRequired: false,
} as const satisfies AuthState;

const featureReducer = createReducer(
  initialAuthState,
  on(
    GetCurrentUserSuccess,
    RefreshTokenSuccess,
    UpdateMenuFavorisSuccess,
    UpdateMenuFavorisError,
    SetRefreshTokenInProgress,
    SetCurrentCenter,
    (state, action) => ({
      ...state,
      ...action,
    })
  ),
  on(LoginSuccess, (state, action) => ({
    ...state,
    ...action,
    mfaRequired: false,
  })),
  on(LoginMfaRequired, (state) => ({
    ...state,
    mfaRequired: true,
  })),
  on(InitializeAuthState, () => ({
    ...initialAuthState,
  })),
  on(RefreshTokenError, LoginError, (state, { errors }) => ({
    ...state,
    jwtTokens: new JwtTokens(),
    errors,
  })),
  on(GetCurrentUserError, (state, { errors }) => ({
    ...state,
    user: new CurrentUser(),
    errors,
  })),
  on(ResetError, (state) => ({
    ...state,
    errors: new WsErrorClass(),
  }))
);

export function authReducer(state: AuthState | undefined, action: Action): AuthState {
  return featureReducer(state, action);
}
