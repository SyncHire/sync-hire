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
  footer,
} from "./styles";

interface VerificationEmailProps {
  verificationUrl: string;
}

export function VerificationEmail({ verificationUrl }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for SyncHire</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to SyncHire</Heading>
          <Text style={text}>
            Thanks for signing up! Please verify your email address by clicking
            the button below.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Link href={verificationUrl} style={link}>
            {verificationUrl}
          </Link>
          <Text style={footer}>
            If you didn&apos;t create an account with SyncHire, you can safely
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
