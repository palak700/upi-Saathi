"""Pydantic request/response schemas.

Response shapes deliberately match the JSON contract produced by the original
Express API so the existing React client keeps working without changes.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# --------------------------------------------------------------------------- #
# Shared / health
# --------------------------------------------------------------------------- #


class HealthCheckResponse(BaseModel):
    status: str = "ok"


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str = "user"
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_language: str


class SignupBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str
    token: str
    user: UserOut


class RefreshTokenBody(BaseModel):
    refreshToken: str


class LogoutBody(BaseModel):
    refreshToken: Optional[str] = None


class ProfileUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=32)
    photo_url: Optional[str] = Field(default=None, max_length=500)
    preferred_language: Optional[str] = Field(default=None, max_length=12)


# --------------------------------------------------------------------------- #
# Settings / accessibility
# --------------------------------------------------------------------------- #


class AccessibilitySettings(BaseModel):
    id: Optional[int] = None
    profileName: str = "Aarav"
    language: str = "en"
    voiceGuidance: bool = True
    voiceSelection: str = "default"
    speechSpeed: float = 1.0
    largeText: bool = False
    highContrast: bool = False
    screenReader: bool = False
    simplifiedMode: bool = False
    literacyMode: bool = False
    reducedMotion: bool = False
    dailySafetyReminders: bool = True
    learningReminders: bool = True
    practiceReminders: bool = True


class SaveSettingsBody(AccessibilitySettings):
    profileName: str = Field(description="Display name shown in the app")
    language: str = Field(description="Language code: en, hi, mr, ta, te, gu, bn, kn, ml, pa, raj")


class LanguageOut(BaseModel):
    code: str
    name: str
    nativeName: str


class NotificationPreferencesOut(BaseModel):
    sms: bool = True
    whatsapp: bool = True
    voice: bool = True
    email: bool = False
    emergencyPaymentNotifications: bool = True


class NotificationPreferencesBody(NotificationPreferencesOut):
    pass


class VoiceSettingsOut(BaseModel):
    language: str = "en"
    speed: float = 1.0
    gender: str = "default"
    volume: float = 1.0


class VoiceSettingsBody(VoiceSettingsOut):
    speed: float = Field(ge=0.5, le=2.0)
    volume: float = Field(ge=0.0, le=1.0)


class TrustedContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    relationship: Optional[str] = None
    notifyOnEmergencyPayment: bool = True


class TrustedContactBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=5, max_length=32)
    relationship: Optional[str] = Field(default=None, max_length=80)
    notifyOnEmergencyPayment: bool = True


# --------------------------------------------------------------------------- #
# Payments
# --------------------------------------------------------------------------- #


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient: str
    amount: float
    date: datetime
    status: str
    safetyStatus: str
    source: str
    demoLabel: str
    transactionId: str
    paymentType: str
    receiptUrl: Optional[str] = None
    notificationStatus: str = "pending"
    qrScanId: Optional[int] = None
    learningNote: str


class GuidePaymentBody(BaseModel):
    recipient: str
    amount: float = Field(gt=0)
    source: str = "voice"


class SafetyCheckOut(BaseModel):
    name: str
    passed: bool
    detail: str


class GuidePaymentResponse(BaseModel):
    safe: bool
    warnings: list[str]
    checks: list[SafetyCheckOut]
    summary: str


class ConfirmPaymentBody(BaseModel):
    recipient: str
    amount: float = Field(gt=0)
    source: str = "voice"
    merchantMismatchAccepted: bool = False


class ConfirmPaymentResponse(PaymentOut):
    pass


class PaymentConfirmationBody(BaseModel):
    recipient: str = Field(description="Display name of the payee")
    receiver: str = Field(description="UID of the person who verified before this flow")
    amount: float = Field(gt=0)
    language: str = "en"
    channel: Literal["sms", "whatsapp", "voice", "all"] = "all"
    trustedContactPhone: Optional[str] = None
    trustedContactName: Optional[str] = None


class ChannelDelivery(BaseModel):
    sms: bool = False
    whatsapp: bool = False
    voice: bool = False
    trustedContact: bool = False


class PaymentConfirmationResponse(BaseModel):
    messagePreview: str
    messageLocalized: str
    delivered: ChannelDelivery
    reason: str
    channels: list[str]


# --------------------------------------------------------------------------- #
# Voice / intent
# --------------------------------------------------------------------------- #


class TranscribeVoiceBody(BaseModel):
    transcript: str = ""
    language: str = "en"
    audioBase64: Optional[str] = None


class IntentOut(BaseModel):
    transcript: str
    intent: str
    confidence: float
    entities: dict
    response: str


class SpeakTextBody(BaseModel):
    text: str
    language: str = "en"


class SpeakTextResponse(BaseModel):
    text: str
    language: str
    supported: bool


class SpeakAudioResponse(BaseModel):
    audioBase64: str
    content_type: str
    language: str


class TranslateTextBody(BaseModel):
    text: str
    language: str = "en"


class TranslateTextResponse(BaseModel):
    text: str
    language: str
    translatedText: str


# --------------------------------------------------------------------------- #
# QR
# --------------------------------------------------------------------------- #


class ReadQrBody(BaseModel):
    merchant: str
    amount: float = Field(gt=0)
    source: str = "scan"


class QrSafetyCheckOut(BaseModel):
    name: str
    passed: bool
    detail: str


class ReadQrResponse(BaseModel):
    detected: bool
    merchant: str
    amount: float
    safe: bool
    warnings: list[str]
    checks: list[QrSafetyCheckOut]
    summary: str


class QrHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    merchant: str
    amount: float
    status: str
    warning: Optional[str]
    createdAt: datetime


class ExplainQrBody(BaseModel):
    payload: Optional[str] = None
    imageBase64: Optional[str] = None
    expectedMerchant: Optional[str] = None


class RiskRecommendationOut(BaseModel):
    title: str
    detail: str


class ExplainQrResponse(BaseModel):
    risk_level: str
    reason: str
    recommendations: list[RiskRecommendationOut]
    sources: list[str]
    decoded: dict


# --------------------------------------------------------------------------- #
# Dashboard / analytics / history
# --------------------------------------------------------------------------- #


class DashboardResponse(BaseModel):
    userName: str
    accessibilityScore: int
    offlineProgress: int
    safetyAlerts: int
    recentPayments: list[PaymentOut]
    weeklyActivity: list[dict]


class AnalyticsResponse(BaseModel):
    practiceSessions: list[dict]
    lessonsCompleted: int
    assistantUses: int
    fraudQuizScore: int
    accessibilityUsage: int
    paymentSimulations: int
    languageUsage: list[dict]


class HistoryResponse(BaseModel):
    payments: list[PaymentOut]


class ActivityLogOut(BaseModel):
    id: int
    activityType: str
    value: int
    metadata: dict
    createdAt: datetime


# --------------------------------------------------------------------------- #
# Tutorials / learning
# --------------------------------------------------------------------------- #


class TutorialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    icon: str
    difficulty: str
    minutes: int
    progress: int
    offline: bool


class GetTutorialsResponse(BaseModel):
    tutorials: list[TutorialOut]


class UpdateTutorialProgressBody(BaseModel):
    progress: Optional[int] = None
    completed: Optional[bool] = None
    quizScore: Optional[int] = None
    bookmarked: Optional[bool] = None


class UpdateTutorialProgressResponse(BaseModel):
    tutorialId: int
    progress: int
    completed: bool
    quizScore: int
    bookmarked: bool


# --------------------------------------------------------------------------- #
# Fraud
# --------------------------------------------------------------------------- #


class FraudAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    result: str
    createdAt: datetime


class GetFraudAlertsResponse(BaseModel):
    alerts: list[FraudAlertOut]


class SubmitFraudQuizBody(BaseModel):
    category: str
    result: str


class SubmitFraudQuizResponse(BaseModel):
    id: int
    category: str
    result: str
    createdAt: datetime


# --------------------------------------------------------------------------- #
# Assistant
# --------------------------------------------------------------------------- #


class AssistantMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_: str = Field(alias="from", serialization_alias="from")
    message: str
    createdAt: datetime


class GetAssistantHistoryResponse(BaseModel):
    history: list[AssistantMessageOut]


class SendAssistantMessageBody(BaseModel):
    message: str
    language: str = "en"


class SendAssistantMessageResponse(BaseModel):
    id: int
    from_: str = Field(alias="from", serialization_alias="from")
    message: str
    createdAt: datetime


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    message: str
    read: bool
    createdAt: datetime


class GetNotificationsResponse(BaseModel):
    notifications: list[NotificationOut]
