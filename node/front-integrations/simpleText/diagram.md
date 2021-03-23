title Sinch-FrontApp Architecture

End-User->Sinch: Send "Hello" Message
Sinch->App: Post /inbound/sinch
App-->FrontApp: Post /channels/{channel_id}/incoming_messages
FrontApp -->App: Send message /inbound/front
App -> Sinch: Post /messages:send
Sinch -->End-User: Deliver message
