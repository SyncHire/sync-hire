/**
 * CV Processor
 *
 * Handles PDF extraction and AI-powered structured extraction using Gemini.
 * Uses @google/genai with inline PDF data for direct document processing.
 * Implements structured output with Zod schemas.
 */

import type { ExtractedCVData } from "@sync-hire/database";
import { z } from "zod";
import { geminiClient } from "@/lib/gemini-client";
import type { CloudStorageProvider } from "@/lib/storage/cloud/cloud-storage-provider";
import type { StorageInterface } from "@/lib/storage/storage-interface";
import { generateFileHash } from "@/lib/utils/hash-utils";

// Define Zod schema for extracted CV data
const extractedCVDataSchema = z.object({
  personalInfo: z
    .any()
    .nullable()
    .transform((obj) => {
      if (typeof obj !== "object" || obj === null) {
        return {
          fullName: "",
          email: undefined,
          phone: undefined,
          location: undefined,
          summary: undefined,
          linkedinUrl: undefined,
          githubUrl: undefined,
          portfolioUrl: undefined,
        };
      }
      return {
        fullName: (obj.fullName || "").toString(),
        email: obj.email ? obj.email.toString() : undefined,
        phone: obj.phone ? obj.phone.toString() : undefined,
        location: obj.location ? obj.location.toString() : undefined,
        summary: obj.summary ? obj.summary.toString() : undefined,
        linkedinUrl: obj.linkedinUrl ? obj.linkedinUrl.toString() : undefined,
        githubUrl: obj.githubUrl ? obj.githubUrl.toString() : undefined,
        portfolioUrl: obj.portfolioUrl
          ? obj.portfolioUrl.toString()
          : undefined,
      };
    }),
  experience: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (typeof item === "string" || item === null) {
          return {
            title: item || "",
            company: "",
            location: undefined,
            startDate: "",
            endDate: undefined,
            current: false,
            description: [],
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            title: (item.title || "").toString(),
            company: (item.company || "").toString(),
            location: item.location ? item.location.toString() : undefined,
            startDate: (item.startDate || "").toString(),
            endDate: item.endDate ? item.endDate.toString() : undefined,
            current: Boolean(item.current),
            description: Array.isArray(item.description)
              ? item.description.map((d: unknown) => (d || "").toString())
              : [],
          };
        }
        return {
          title: "",
          company: "",
          location: undefined,
          startDate: "",
          endDate: undefined,
          current: false,
          description: [],
        };
      });
    })
    .describe("Work experience array"),
  education: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (typeof item === "string" || item === null) {
          return {
            degree: item || "",
            field: "",
            institution: "",
            location: undefined,
            startDate: "",
            endDate: undefined,
            current: false,
            gpa: undefined,
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            degree: (item.degree || "").toString(),
            field: (item.field || "").toString(),
            institution: (item.institution || "").toString(),
            location: item.location ? item.location.toString() : undefined,
            startDate: (item.startDate || "").toString(),
            endDate: item.endDate ? item.endDate.toString() : undefined,
            current: Boolean(item.current),
            gpa: item.gpa ? item.gpa.toString() : undefined,
          };
        }
        return {
          degree: "",
          field: "",
          institution: "",
          location: undefined,
          startDate: "",
          endDate: undefined,
          current: false,
          gpa: undefined,
        };
      });
    })
    .describe("Education history array"),
  skills: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((skill) => (skill || "").toString()).filter(Boolean);
    })
    .describe("Technical and professional skills"),
  certifications: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (typeof item === "string" || item === null) {
          return {
            name: item || "",
            issuer: "",
            issueDate: undefined,
            expiryDate: undefined,
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            name: (item.name || "").toString(),
            issuer: item.issuer ? item.issuer.toString() : "",
            issueDate: item.issueDate ? item.issueDate.toString() : undefined,
            expiryDate: item.expiryDate
              ? item.expiryDate.toString()
              : undefined,
          };
        }
        return {
          name: "",
          issuer: "",
          issueDate: undefined,
          expiryDate: undefined,
        };
      });
    })
    .describe("Professional certifications array"),
  languages: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (typeof item === "string" || item === null) {
          return {
            language: item || "",
            proficiency: "Basic" as const,
          };
        }
        if (typeof item === "object" && item !== null) {
          const proficiency = [
            "Basic",
            "Intermediate",
            "Advanced",
            "Fluent",
            "Native",
          ].includes(item.proficiency)
            ? item.proficiency
            : "Basic";
          return {
            language: (item.language || "").toString(),
            proficiency: proficiency as
              | "Basic"
              | "Intermediate"
              | "Advanced"
              | "Fluent"
              | "Native",
          };
        }
        return {
          language: "",
          proficiency: "Basic" as const,
        };
      });
    })
    .describe("Languages array"),
  projects: z
    .any()
    .nullable()
    .transform((arr) => {
      // Handle string input by converting to array with one item
      if (typeof arr === "string") {
        arr = [arr];
      }
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => {
        if (typeof item === "string" || item === null) {
          return {
            name: item || "",
            description: "",
            technologies: [],
            url: undefined,
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            name: (item.name || "").toString(),
            description: (item.description || "").toString(),
            technologies: Array.isArray(item.technologies)
              ? item.technologies
                  .map((tech: unknown) => (tech || "").toString())
                  .filter(Boolean)
              : [],
            url: item.url ? item.url.toString() : undefined,
          };
        }
        return {
          name: "",
          description: "",
          technologies: [],
          url: undefined,
        };
      });
    })
    .describe("Personal projects array"),
});

export class CVProcessor {
  constructor(
    private storage: StorageInterface,
    private cloudStorage: CloudStorageProvider,
  ) {}

  /**
   * Process a PDF file and extract structured CV data
   */
  async processFile(
    buffer: Buffer,
    fileName: string,
  ): Promise<{
    hash: string;
    extractedData: ExtractedCVData;
    cached: boolean;
  }> {
    // Validate PDF file type
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext !== "pdf") {
      throw new Error(
        `Unsupported file type: ${ext}. Only PDF files are supported.`,
      );
    }

    // Generate hash for deduplication
    const hash = generateFileHash(buffer);

    // Check if already cached
    const cached = await this.storage.hasCVExtraction(hash);
    if (cached) {
      const extractedData = await this.storage.getCVExtraction(hash);
      if (extractedData) {
        return { hash, extractedData, cached: true };
      }
    }

    // Call Gemini API with PDF buffer for structured extraction
    const extractedData = await this.callGeminiAPI(buffer);

    // Save to cache
    await this.storage.saveCVExtraction(hash, extractedData);

    // Upload original file to cloud storage
    await this.cloudStorage.uploadCV(hash, buffer);

    return { hash, extractedData, cached: false };
  }

  /**
   * Call Gemini API for structured CV data extraction using inline PDF data
   * Uses enhanced parsing and post-processing for better accuracy
   */
  private async callGeminiAPI(buffer: Buffer): Promise<ExtractedCVData> {
    try {
      const enhancedPrompt = `You are an expert CV parser. Extract structured information from the provided PDF resume/CV with high accuracy.

IMPORTANT PARSING RULES:
1. Parse arrays as actual JSON arrays, not as strings
2. Separate job titles from company names - don't mix them
3. Extract full personal information including name, email, phone
4. Use proper date formats (YYYY-MM or YYYY-MM-DD)
5. Don't include empty/null entries in arrays
6. Each experience item should have: title, company, dates, and description
7. Each education item should have: degree, institution, field, and dates
8. Each certification should be a separate object, not a combined string

Return a valid JSON object with this structure:
{
  "personalInfo": {
    "fullName": "extract the person's full name",
    "email": "email address if found",
    "phone": "phone number if found",
    "location": "city/country if found",
    "summary": "professional summary if found",
    "linkedinUrl": "LinkedIn URL if found",
    "githubUrl": "GitHub URL if found",
    "portfolioUrl": "portfolio URL if found"
  },
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "location": "job location",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": true/false,
      "description": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "field": "field of study",
      "institution": "university name",
      "location": "campus location",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": false,
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization",
      "issueDate": "YYYY-MM",
      "expiryDate": "YYYY-MM",
      "credentialId": "ID if available"
    }
  ],
  "languages": [
    {
      "language": "language name",
      "proficiency": "Basic|Intermediate|Advanced|Native"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "technologies": ["tech1", "tech2"],
      "url": "project URL if available",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM"
    }
  ]
}

Focus on accuracy and proper data structure. Parse ALL available information correctly.`;

      // Convert PDF buffer to base64 for inline data
      const base64Data = buffer.toString("base64");

      // Send PDF to Gemini without schema constraints first
      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: enhancedPrompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1, // Lower temperature for more consistent output
        },
      });

      const content = response.text || "";

      // Parse the raw response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (_parseError) {
        // Try to extract JSON from potentially malformed response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      }

      // Apply enhanced post-processing
      const processedData = this.postProcessExtraction(parsed);

      // Validate with our flexible schema
      const validated = extractedCVDataSchema.parse(processedData);

      return validated;
    } catch (_error) {
      // Return empty extraction on failure (background process, no user impact)
      return {
        personalInfo: {
          fullName: "",
          email: undefined,
          phone: undefined,
          location: undefined,
          summary: undefined,
          linkedinUrl: undefined,
          githubUrl: undefined,
          portfolioUrl: undefined,
        },
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        languages: [],
        projects: [],
      };
    }
  }

  /**
   * Enhanced post-processing to fix common CV extraction issues
   */
  private postProcessExtraction(rawData: any): any {
    const processed = {
      personalInfo: {
        fullName: this.extractFullName(rawData.personalInfo),
        email: this.extractContactInfo(rawData.personalInfo, "email"),
        phone: this.extractContactInfo(rawData.personalInfo, "phone"),
        location: this.extractContactInfo(rawData.personalInfo, "location"),
        summary: this.extractContactInfo(rawData.personalInfo, "summary"),
        linkedinUrl: this.extractContactInfo(
          rawData.personalInfo,
          "linkedinUrl",
        ),
        githubUrl: this.extractContactInfo(rawData.personalInfo, "githubUrl"),
        portfolioUrl: this.extractContactInfo(
          rawData.personalInfo,
          "portfolioUrl",
        ),
      },
      experience: this.fixExperienceArray(rawData.experience || []),
      education: this.fixEducationArray(rawData.education || []),
      skills: this.fixSkillsArray(rawData.skills || []),
      certifications: this.fixCertificationsArray(rawData.certifications || []),
      languages: this.fixLanguagesArray(rawData.languages || []),
      projects: this.fixProjectsArray(rawData.projects || []),
    };

    return processed;
  }

  /**
   * Extract full name from personal info or attempt to find it elsewhere
   */
  private extractFullName(personalInfo: any): string {
    if (
      personalInfo?.fullName &&
      typeof personalInfo.fullName === "string" &&
      personalInfo.fullName.trim()
    ) {
      return personalInfo.fullName.trim();
    }

    // Try to extract from email as fallback
    if (personalInfo?.email && typeof personalInfo.email === "string") {
      const emailParts = personalInfo.email.split("@");
      if (emailParts[0] && emailParts[0].length > 2) {
        return emailParts[0]
          .replace(/[^a-zA-Z\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    return "";
  }

  /**
   * Extract contact info safely
   */
  private extractContactInfo(
    personalInfo: any,
    field: string,
  ): string | undefined {
    if (
      personalInfo?.[field] &&
      typeof personalInfo[field] === "string" &&
      personalInfo[field].trim()
    ) {
      return personalInfo[field].trim();
    }
    return undefined;
  }

  /**
   * Fix experience array - handle JSON strings and mixed data
   */
  private fixExperienceArray(experience: any[]): any[] {
    const fixed: any[] = [];

    for (const item of experience) {
      if (!item) continue;

      // Handle JSON string arrays
      if (typeof item === "string") {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            fixed.push(...this.fixExperienceArray(parsed));
          }
        } catch {
          // It's just a string, treat as title
          fixed.push({
            title: item,
            company: "",
            location: undefined,
            startDate: "",
            endDate: undefined,
            current: false,
            description: [],
          });
        }
        continue;
      }

      // Handle object experience items
      if (typeof item === "object") {
        const title = this.cleanStringField(item.title);
        const company = this.cleanStringField(item.company);

        // Skip if both title and company are empty
        if (!title && !company) continue;

        // Detect if data is mixed up (company in title field)
        let finalTitle = title;
        let finalCompany = company;

        // Common indicators that title field actually contains company
        if (
          title &&
          !company &&
          (title.toLowerCase().includes("gmbh") ||
            title.toLowerCase().includes("inc") ||
            title.toLowerCase().includes("ltd") ||
            title.toLowerCase().includes("university") ||
            title.toLowerCase().includes("freelance"))
        ) {
          finalTitle = company || "";
          finalCompany = title;
        }

        fixed.push({
          title: finalTitle || "",
          company: finalCompany || "",
          location: item.location
            ? this.cleanStringField(item.location)
            : undefined,
          startDate: this.normalizeDate(item.startDate),
          endDate: this.normalizeDate(item.endDate),
          current: Boolean(item.current),
          description: this.parseDescriptionArray(item.description),
        });
      }
    }

    return fixed;
  }

  /**
   * Fix education array
   */
  private fixEducationArray(education: any[]): any[] {
    const fixed: any[] = [];

    for (const item of education) {
      if (!item) continue;

      // Handle JSON string arrays
      if (typeof item === "string") {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            fixed.push(...this.fixEducationArray(parsed));
          }
        } catch {
          // Treat as institution
          fixed.push({
            degree: "",
            field: "",
            institution: this.cleanStringField(item),
            location: undefined,
            startDate: "",
            endDate: "",
            current: false,
            gpa: undefined,
          });
        }
        continue;
      }

      if (typeof item === "object") {
        const degree = this.cleanStringField(item.degree);
        const institution = this.cleanStringField(item.institution);

        // Skip if both are empty
        if (!degree && !institution) continue;

        // Detect if data is mixed up
        let finalDegree = degree;
        let finalInstitution = institution;

        if (
          institution &&
          !degree &&
          (institution.toLowerCase().includes("bachelor") ||
            institution.toLowerCase().includes("master") ||
            institution.toLowerCase().includes("phd") ||
            institution.toLowerCase().includes("msc") ||
            institution.toLowerCase().includes("bsc"))
        ) {
          finalDegree = institution;
          finalInstitution = degree || "";
        }

        fixed.push({
          degree: finalDegree || "",
          field: this.cleanStringField(item.field),
          institution: finalInstitution || "",
          location: item.location
            ? this.cleanStringField(item.location)
            : undefined,
          startDate: this.normalizeDate(item.startDate),
          endDate: this.normalizeDate(item.endDate),
          current: Boolean(item.current),
          gpa: item.gpa ? this.cleanStringField(item.gpa) : undefined,
        });
      }
    }

    return fixed;
  }

  /**
   * Fix skills array
   */
  private fixSkillsArray(skills: any): string[] {
    if (typeof skills === "string") {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) {
          return this.fixSkillsArray(parsed);
        }
      } catch {
        // Split by common delimiters
        return skills
          .split(/[,;\n|]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    if (Array.isArray(skills)) {
      return skills
        .map((skill) => this.cleanStringField(skill))
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Fix certifications array
   */
  private fixCertificationsArray(certifications: any): any[] {
    const fixed: any[] = [];

    if (typeof certifications === "string") {
      try {
        const parsed = JSON.parse(certifications);
        if (Array.isArray(parsed)) {
          return this.fixCertificationsArray(parsed);
        }
      } catch {
        // Treat as single certification name
        return [
          {
            name: this.cleanStringField(certifications),
            issuer: "",
            issueDate: undefined,
            expiryDate: undefined,
          },
        ];
      }
    }

    if (Array.isArray(certifications)) {
      for (const cert of certifications) {
        if (!cert) continue;

        if (typeof cert === "string") {
          fixed.push({
            name: this.cleanStringField(cert),
            issuer: "",
            issueDate: undefined,
            expiryDate: undefined,
          });
        } else if (typeof cert === "object") {
          fixed.push({
            name: this.cleanStringField(cert.name),
            issuer: cert.issuer ? this.cleanStringField(cert.issuer) : "",
            issueDate: this.normalizeDate(cert.issueDate) || undefined,
            expiryDate: this.normalizeDate(cert.expiryDate) || undefined,
          });
        }
      }
    }

    return fixed;
  }

  /**
   * Fix languages array
   */
  private fixLanguagesArray(languages: any): any[] {
    const fixed: any[] = [];

    if (typeof languages === "string") {
      try {
        const parsed = JSON.parse(languages);
        if (Array.isArray(parsed)) {
          return this.fixLanguagesArray(parsed);
        }
      } catch {
        return [];
      }
    }

    if (Array.isArray(languages)) {
      for (const lang of languages) {
        if (!lang) continue;

        if (typeof lang === "string") {
          fixed.push({
            language: this.cleanStringField(lang),
            proficiency: "Basic" as const,
          });
        } else if (typeof lang === "object") {
          const language = this.cleanStringField(lang.language);
          let proficiency = lang.proficiency;

          // Normalize proficiency
          if (typeof proficiency === "string") {
            const prof = proficiency.toLowerCase();
            if (prof.includes("native") || prof.includes("c2")) {
              proficiency = "Native";
            } else if (prof.includes("fluent")) {
              proficiency = "Fluent";
            } else if (prof.includes("advanced") || prof.includes("c1")) {
              proficiency = "Advanced";
            } else if (
              prof.includes("intermediate") ||
              prof.includes("b1") ||
              prof.includes("b2")
            ) {
              proficiency = "Intermediate";
            } else {
              proficiency = "Basic";
            }
          } else {
            proficiency = "Basic";
          }

          fixed.push({
            language: language,
            proficiency: proficiency as
              | "Basic"
              | "Intermediate"
              | "Advanced"
              | "Fluent"
              | "Native",
          });
        }
      }
    }

    return fixed;
  }

  /**
   * Fix projects array
   */
  private fixProjectsArray(projects: any): any[] {
    const fixed: any[] = [];

    if (typeof projects === "string") {
      try {
        const parsed = JSON.parse(projects);
        if (Array.isArray(parsed)) {
          return this.fixProjectsArray(parsed);
        }
      } catch {
        return [];
      }
    }

    if (Array.isArray(projects)) {
      for (const project of projects) {
        if (!project) continue;

        if (typeof project === "string") {
          fixed.push({
            name: this.cleanStringField(project),
            description: "",
            technologies: [],
            url: undefined,
          });
        } else if (typeof project === "object") {
          const name = this.cleanStringField(project.name);
          const description = this.cleanStringField(project.description);

          // Skip if both name and description are empty
          if (!name && !description) continue;

          fixed.push({
            name: name || "",
            description: description || "",
            technologies: this.parseTechnologiesArray(project.technologies),
            url: project.url ? this.cleanStringField(project.url) : undefined,
          });
        }
      }
    }

    return fixed;
  }

  /**
   * Helper to clean string fields
   */
  private cleanStringField(value: any): string {
    if (typeof value === "string") {
      return value.trim();
    }
    return "";
  }

  /**
   * Parse description array
   */
  private parseDescriptionArray(description: any): string[] {
    if (Array.isArray(description)) {
      return description.map((d) => this.cleanStringField(d)).filter(Boolean);
    }
    if (typeof description === "string") {
      try {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) {
          return this.parseDescriptionArray(parsed);
        }
      } catch {
        // Split by common delimiters
        return description
          .split(/[.;\n]/)
          .map((d) => d.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  /**
   * Parse technologies array
   */
  private parseTechnologiesArray(technologies: any): string[] {
    if (Array.isArray(technologies)) {
      return technologies.map((t) => this.cleanStringField(t)).filter(Boolean);
    }
    if (typeof technologies === "string") {
      try {
        const parsed = JSON.parse(technologies);
        if (Array.isArray(parsed)) {
          return this.parseTechnologiesArray(parsed);
        }
      } catch {
        return technologies
          .split(/[,;\s|]/)
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  /**
   * Normalize date formats
   */
  private normalizeDate(date: any): string {
    if (!date) return "";

    if (typeof date === "string") {
      const cleaned = this.cleanStringField(date);

      // Handle various date formats
      const datePatterns = [
        /(\d{4})-(\d{2})/, // YYYY-MM
        /(\d{2})\/(\d{4})/, // MM/YYYY
        /(\d{4})\/(\d{2})/, // YYYY/MM
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i, // Month YYYY
        /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY
      ];

      for (const pattern of datePatterns) {
        const match = cleaned.match(pattern);
        if (match) {
          return cleaned;
        }
      }

      return cleaned;
    }

    return "";
  }
}
