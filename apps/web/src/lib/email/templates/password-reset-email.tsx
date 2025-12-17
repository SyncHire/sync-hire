import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  main,
  container,
  h1,
  text,
  buttonContainer,
  button,
  link,
  warningUrgent,
  footer,
} from "./styles";

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your SyncHire password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset Your Password</Heading>
          <Text style={text}>
            We received a request to reset your password. Click the button below
            to choose a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
          {/* Expiration matches Better Auth default (1 hour) */}
          <Text style={warningUrgent}>
            This link will expire in 1 hour for security reasons.
          </Text>
          <Text style={footer}>
            If you didn&apos;t request a password reset, you can safely ignore
            this email. Your password will remain unchanged.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
