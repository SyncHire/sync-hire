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
import {
  button,
  buttonContainer,
  container,
  footer,
  h1,
  main,
  text,
  warningInfo,
} from "./styles";

interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
}

export function InvitationEmail({
  organizationName,
  inviterName,
  invitationUrl,
}: InvitationEmailProps) {
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
            <Button style={button} href={invitationUrl}>
              Accept Invitation
            </Button>
          </Section>
          {/* Expiration matches auth.ts invitationExpiresIn (48 hours) */}
          <Text style={warningInfo}>
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
