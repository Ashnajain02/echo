
import { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export interface SignUpMetadata {
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

