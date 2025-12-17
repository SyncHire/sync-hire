import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
}

export function InvitationEmail({
  organizationName,
  inviterName,
}: InvitationEmailProps) {
  // Base URL for accepting invitations
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
  const acceptUrl = `${baseUrl}/login`;

  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {organizationName} on SyncHire
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;re Invited!</Heading>
          <Text style={text}>
            <strong>{inviterName}</strong> has invited you to join{" "}
            <strong>{organizationName}</strong> on SyncHire.
          </Text>
          <Text style={text}>
            SyncHire is an AI-powered interview platform that helps teams
            conduct consistent, scalable technical interviews.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={warning}>
            This invitation will expire in 48 hours.
          </Text>
          <Text style={footer}>
            If you don&apos;t want to join this organization, you can safely
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "465px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  marginBottom: "16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

const warning = {
  color: "#f59e0b",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "16px",
  textAlign: "center" as const,
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "32px",
};

export default InvitationEmail;
