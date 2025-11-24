export interface AuthRequest {
  address: string;
}

export interface RegistrationResponse {
  data: {
    address: string;
    balance: number;
  };
  message: string;
  status: number;
}
