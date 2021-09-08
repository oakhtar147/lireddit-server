import { RegisterInput } from "src/resolvers/User";
import { FieldErrorType } from "src/types";
import { UserFields } from '../resolvers/User';


export function validateRegistration(
  { username, password, email }: RegisterInput, 
 ) {
  const errors:  Array<FieldErrorType<UserFields>> = [];

  if (username.length < 3) {
    errors.push({
      field: UserFields.USERNAME,
      message: "Username cannot be less than 3 characters",
    });
  }

  if (password.length < 3) {
    errors.push({
      field: UserFields.PASSWORD,
      message: "Password cannot be less than 3 characters",
    });
  }

  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const isValidEmail =  re.test(email.toLowerCase());

  if (!isValidEmail) {
    errors.push({
      field: UserFields.EMAIL,
      message: "Invalid email has been provided",
    });
  }

  return errors;
}